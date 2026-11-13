/**
 * ssvm-backend/src/services/admissions-bulk/admission-paper-forms.service.ts
 *
 * Canonical Paper Form and Printable PDF Generator for SSVM ERP Admissions.
 * Supports:
 *   1. New Admission Form (with INR 200 standard application fee notice)
 *   2. Re-admission Form (retains existing permanent SSVM identity)
 *   3. Incoming Transfer Admission Form (captures TC and previous institution history)
 *
 * Enforces:
 *   - A4 Portrait print dimensions (210mm x 297mm) with balanced margins
 *   - No preassigned permanent Admission/Registration Number on blank forms
 *   - Clear separation between previous school registration numbers and SSVM identity
 *   - Informational fee snapshots without triggering payment transactions
 */

import handlebars from "handlebars";
import prisma from "../../lib/prisma";
import { AdmissionFeeConfigService } from "./admission-fee-config.service";

export interface PaperFormOptions {
  schoolName?: string;
  affiliationNumber?: string;
  academicSession?: string;
  applicationFee?: number;
  formNumber?: string;
  formVersion?: string;
}

export class AdmissionPaperFormsService {
  private static readonly FORM_STYLES = `
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      padding: 4px;
    }
    .form-container {
      border: 1.5px solid #1e293b;
      padding: 14px 18px;
      position: relative;
    }
    .form-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .institution-name {
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .institution-subtitle {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
    }
    .form-title-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 14px;
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-radius: 4px;
    }
    .fee-notice {
      float: right;
      font-size: 10px;
      font-weight: 700;
      color: #047857;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: -24px;
    }
    .photo-box {
      float: right;
      width: 32mm;
      height: 40mm;
      border: 1.5px dashed #475569;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 9px;
      color: #64748b;
      padding: 4px;
      margin-left: 12px;
      margin-bottom: 8px;
      background: #f8fafc;
    }
    .section-title {
      background: #f1f5f9;
      border-left: 3px solid #0f172a;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
      margin-bottom: 6px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px 12px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 6px 8px;
    }
    .field-row {
      margin-bottom: 5px;
    }
    .field-label {
      font-size: 9.5px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 2px;
    }
    .field-input-line {
      border-bottom: 1px solid #94a3b8;
      min-height: 16px;
      font-size: 10px;
      color: #0f172a;
    }
    .field-input-box {
      border: 1px solid #94a3b8;
      height: 18px;
      padding: 1px 4px;
      font-size: 10px;
      border-radius: 2px;
    }
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      margin-bottom: 6px;
      font-size: 9.5px;
    }
    .table-custom th, .table-custom td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      text-align: left;
    }
    .table-custom th {
      background: #f8fafc;
      font-weight: 700;
      color: #1e293b;
    }
    .declaration-text {
      font-size: 9px;
      color: #334155;
      text-align: justify;
      line-height: 1.35;
      margin-top: 6px;
      padding: 6px 8px;
      background: #fcfcfc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 18px;
      padding-top: 16px;
    }
    .signature-block {
      text-align: center;
      width: 150px;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 4px;
    }
    .office-use-box {
      margin-top: 10px;
      border: 1.5px solid #0f172a;
      padding: 8px 10px;
      background: #fafaf9;
    }
    .office-title {
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .badge-retained {
      display: inline-block;
      padding: 2px 6px;
      background: #dbeafe;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      font-weight: 700;
      font-size: 9px;
      border-radius: 3px;
    }
    .page-footer {
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  `;

  /**
   * Authoritatively resolves form metadata and immutable fee:
   * 1. If formNumber is provided, loads the snapshot from tenant-scoped AuditLog.
   *    Validates that the snapshot belongs to the school and matches requested formType.
   *    Uses snapshot feeAmount, academicSession, and applicantName.
   * 2. If formNumber is not provided, loads the currently active fee for the school
   *    from tenant configuration.
   * 3. Completely ignores and rejects caller-supplied fee overrides.
   */
  public static async resolveFormOptions(
    schoolId: string,
    formType: "NEW" | "READMISSION" | "TRANSFER",
    options: PaperFormOptions = {}
  ): Promise<{
    fee: number;
    sessionName: string;
    formNumber: string;
    applicantName?: string;
    isIssued: boolean;
  }> {
    if (options.formNumber) {
      const snapshot = await AdmissionFeeConfigService.getIssuedFormSnapshot(schoolId, options.formNumber);
      if (!snapshot) {
        throw new Error(`Issued admission form ${options.formNumber} not found for this institution.`);
      }
      if (snapshot.formType !== formType) {
        throw new Error(`Form type mismatch: issued form is ${snapshot.formType} but requested ${formType}.`);
      }
      return {
        fee: snapshot.feeAmount,
        sessionName: snapshot.academicSession || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        formNumber: snapshot.formNumber,
        applicantName: snapshot.applicantName,
        isIssued: true,
      };
    }

    const currentFee = await AdmissionFeeConfigService.getApplicationFee(schoolId);
    return {
      fee: currentFee,
      sessionName: options.academicSession || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      formNumber: "",
      applicantName: undefined,
      isIssued: false,
    };
  }

  public static async resolveFormFee(schoolId: string, options: PaperFormOptions = {}): Promise<number> {
    if (options.formNumber) {
      const snapshot = await AdmissionFeeConfigService.getIssuedFormSnapshot(schoolId, options.formNumber);
      if (snapshot && snapshot.feeAmount !== undefined) {
        return snapshot.feeAmount;
      }
    }
    return AdmissionFeeConfigService.getApplicationFee(schoolId);
  }

  /**
   * Render New Admission Paper Form HTML
   */
  public static async renderNewAdmissionForm(schoolId: string, options: PaperFormOptions = {}): Promise<string> {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const resolved = await this.resolveFormOptions(schoolId, "NEW", options);
    const version = options.formVersion || "v1.0.0-ADM";
    const sessionName = resolved.sessionName;
    const fee = resolved.fee;
    const formNumber = resolved.formNumber;
    const applicantName = resolved.applicantName;

    const templateHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>New Admission Application Form - {{sessionName}}</title>
        <style>${this.FORM_STYLES}</style>
      </head>
      <body>
        <div class="form-container">
          <div class="fee-notice">Application Fee: ₹{{fee}} (Non-refundable)</div>
          <div class="form-header">
            <div class="institution-name">{{schoolName}}</div>
            <div class="institution-subtitle">Affiliation / Institutional Code: {{affiliation}} | Academic Session: {{sessionName}}</div>
            <div class="form-title-badge">Student Admission Application Form (New Admission)</div>
          </div>

          <div class="photo-box">
            <span>Affix Recent Passport Size Photograph</span>
            <span style="font-size: 8px; margin-top: 4px;">(Self-attested)</span>
          </div>

          <div style="margin-right: 36mm;">
            <div class="grid-2">
              <div class="field-row">
                <div class="field-label">1. Academic Session:</div>
                <div class="field-input-box" style="font-weight: 700;">{{sessionName}}</div>
              </div>
              <div class="field-row">
                <div class="field-label">2. Class Applied For:</div>
                <div class="field-input-box" style="font-weight: 700;">[ Prarambha / Bodha / Class 1 to 12 ]</div>
              </div>
            </div>

            <div class="field-row">
              <div class="field-label">3. Student Full Name (in BLOCK LETTERS as per Birth Certificate):</div>
              <div class="field-input-box"></div>
            </div>
          </div>

          <div class="grid-4" style="clear: both; margin-top: 4px;">
            <div class="field-row">
              <div class="field-label">4. Nickname / Alias:</div>
              <div class="field-input-box"></div>
            </div>
            <div class="field-row">
              <div class="field-label">5. Date of Birth (DD/MM/YYYY):</div>
              <div class="field-input-box"></div>
            </div>
            <div class="field-row">
              <div class="field-label">6. Gender:</div>
              <div class="field-input-box">[ ] Male  [ ] Female  [ ] Other</div>
            </div>
            <div class="field-row">
              <div class="field-label">7. Blood Group:</div>
              <div class="field-input-box">[ A+ / A- / B+ / B- / AB+ / AB- / O+ / O- ]</div>
            </div>
          </div>

          <div class="grid-4">
            <div class="field-row">
              <div class="field-label">8. Nationality:</div>
              <div class="field-input-box">Indian</div>
            </div>
            <div class="field-row">
              <div class="field-label">9. Mother Tongue:</div>
              <div class="field-input-box"></div>
            </div>
            <div class="field-row">
              <div class="field-label">10. Religion:</div>
              <div class="field-input-box"></div>
            </div>
            <div class="field-row">
              <div class="field-label">11. Category:</div>
              <div class="field-input-box">[ ] General  [ ] OBC  [ ] SC  [ ] ST</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="field-row">
              <div class="field-label">12. Permanent Education Number (PEN) (if previously allotted):</div>
              <div class="field-input-box"></div>
            </div>
            <div class="field-row">
              <div class="field-label">13. Locality / Urban / Rural:</div>
              <div class="field-input-box"></div>
            </div>
          </div>

          <div class="section-title">Parent & Guardian Information</div>
          <table class="table-custom">
            <thead>
              <tr>
                <th style="width: 25%;">Particulars</th>
                <th style="width: 25%;">Father</th>
                <th style="width: 25%;">Mother</th>
                <th style="width: 25%;">Local Guardian (if any)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Full Name</strong></td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td><strong>Relationship</strong></td>
                <td>Father</td>
                <td>Mother</td>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td><strong>Primary Mobile Phone</strong></td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td><strong>Email Address</strong></td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td><strong>Occupation & Designation</strong></td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td><strong>Annual Income (INR)</strong></td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">Address & Jurisdiction Details</div>
          <div class="grid-2">
            <div>
              <div class="field-label">Present Residential Address:</div>
              <div style="border: 1px solid #cbd5e1; height: 38px; padding: 2px 4px; font-size: 9px;"></div>
              <div class="grid-2" style="margin-top: 4px;">
                <div><span class="field-label">Police Station:</span><div class="field-input-box"></div></div>
                <div><span class="field-label">District & PIN:</span><div class="field-input-box"></div></div>
              </div>
            </div>
            <div>
              <div class="field-label">Permanent Address:</div>
              <div style="border: 1px solid #cbd5e1; height: 38px; padding: 2px 4px; font-size: 9px;"></div>
              <div class="grid-2" style="margin-top: 4px;">
                <div><span class="field-label">State:</span><div class="field-input-box"></div></div>
                <div><span class="field-label">Emergency Phone:</span><div class="field-input-box"></div></div>
              </div>
            </div>
          </div>

          <div class="section-title">Previous Academic Background & Supporting Documents</div>
          <div class="grid-2">
            <div class="field-row">
              <div class="field-label">Previous School Attended (if any):</div>
              <div class="field-input-box"></div>
            </div>
            <div class="field-row">
              <div class="field-label">Last Class Passed / Percentage:</div>
              <div class="field-input-box"></div>
            </div>
          </div>

          <div style="margin-top: 4px; font-size: 9px;">
            <strong>Mandatory Document Checklist:</strong>
            <span style="margin-left: 8px;">[ ] Birth Certificate</span>
            <span style="margin-left: 8px;">[ ] Aadhaar Card</span>
            <span style="margin-left: 8px;">[ ] Transfer Certificate (TC)</span>
            <span style="margin-left: 8px;">[ ] Previous Report Card</span>
            <span style="margin-left: 8px;">[ ] Blood Group Certificate</span>
            <span style="margin-left: 8px;">[ ] Passport Photos (4)</span>
          </div>

          <div class="section-title">Institutional Facilities &amp; Special Requirements</div>
          <div class="grid-3" style="font-size: 9px;">
            <div class="field-row">
              <span class="field-label">School Transport Facility:</span>
              <div class="field-input-box">[ ] Yes  [ ] No (Route/Stop: ___________)</div>
            </div>
            <div class="field-row">
              <span class="field-label">Hostel / Boarding Facility:</span>
              <div class="field-input-box">[ ] Yes  [ ] No (Dorm / Room: _________)</div>
            </div>
            <div class="field-row">
              <span class="field-label">Dietary / Medical Needs:</span>
              <div class="field-input-box">[ ] None  [ ] Specified: ______________</div>
            </div>
          </div>

          <div class="declaration-text">
            <strong>Parent / Guardian Declaration:</strong> I hereby declare that the particulars furnished above are true and correct to the best of my knowledge and belief. I agree to abide by the rules, academic standards, and disciplinary code of the institution. I acknowledge that registration does not guarantee admission until approved offline by the School Admission Committee.
          </div>

          <div class="signature-area">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div style="font-size: 9px; font-weight: 700;">Date & Place</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div style="font-size: 9px; font-weight: 700;">Signature of Father</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div style="font-size: 9px; font-weight: 700;">Signature of Mother / Guardian</div>
            </div>
          </div>

          <div class="office-use-box">
            <div class="office-title">For Official School Office Use Only (Physical Register Verification)</div>
            <div class="grid-4" style="font-size: 9.5px;">
              <div><strong>Application No:</strong> {{#if formNumber}}{{formNumber}}{{else}}_________________{{/if}}</div>
              <div><strong>Admission Date:</strong> _________________</div>
              <div><strong>Allotted Class & Sec:</strong> _____________</div>
              <div><strong>Allotted Roll No:</strong> ________________</div>
            </div>
            <div class="grid-4" style="font-size: 9.5px; margin-top: 4px;">
              <div><strong>Verified By:</strong> ____________________</div>
              <div><strong>Approval Status:</strong> [ ] Approved [ ] Rejected</div>
              <div><strong>Fee Receipt / Ref No:</strong> ____________</div>
              <div><strong>Permanent Admission No:</strong> _________</div>
            </div>
            <div style="margin-top: 4px; font-size: 8.5px; color: #475569; font-style: italic;">
              * Note: Permanent SSVM Admission/Registration Number (ADM-YYYY-XXXX) is allocated atomically upon digital verification of offline approval register. Blank forms do not carry preassigned numbers.
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
              <span style="font-size: 8.5px; color: #64748b;">Physical Institutional Seal Required</span>
              <span style="font-weight: 700; font-size: 9.5px; color: #047857;">Application Fee: ₹{{fee}} (Non-refundable)</span>
              <span style="font-size: 9px; font-weight: 700;">Signature of Principal / Admission Incharge</span>
            </div>
          </div>

          <div class="page-footer">
            <span>Form Ref: SSVM-ADM-NEW-FORM</span>
            <span>Version: {{version}}</span>
            <span>Printed on: {{printDate}}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const template = handlebars.compile(templateHtml);
    return template({
      schoolName: school?.name || options.schoolName || "Shri Shiksha Vikash Mandir (SSVM)",
      affiliation: school?.code || options.affiliationNumber || "SSVM-ODISHA",
      sessionName,
      fee,
      version,
      formNumber: options.formNumber || "",
      printDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    });
  }

  /**
   * Render Re-Admission Paper Form HTML
   */
  public static async renderReAdmissionForm(schoolId: string, options: PaperFormOptions = {}): Promise<string> {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const resolved = await this.resolveFormOptions(schoolId, "READMISSION", options);
    const version = options.formVersion || "v1.0.0-READM";
    const sessionName = resolved.sessionName;
    const fee = resolved.fee;
    const formNumber = resolved.formNumber;
    const applicantName = resolved.applicantName;

    const templateHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Re-Admission Application Form - {{sessionName}}</title>
        <style>${this.FORM_STYLES}</style>
      </head>
      <body>
        <div class="form-container">
          <div class="fee-notice">Application Fee: ₹{{fee}} (Non-refundable)</div>
          <div class="form-header">
            <div class="institution-name">{{schoolName}}</div>
            <div class="institution-subtitle">Affiliation / Institutional Code: {{affiliation}} | Academic Session: {{sessionName}}</div>
            <div class="form-title-badge" style="background: #1e3a8a;">Student Re-Admission Application Form</div>
          </div>

          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 6px 10px; margin-bottom: 10px; border-radius: 4px;">
            <div class="grid-2">
              <div>
                <span class="badge-retained">Permanent SSVM Identity</span>
                <span style="font-weight: 700; font-size: 11px; margin-left: 6px;">Existing Admission / Reg Number *:</span>
              </div>
              <div style="text-align: right; font-weight: 800; font-size: 12px; font-family: monospace;">
                [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]
              </div>
            </div>
            <div style="font-size: 8.5px; color: #1e40af; margin-top: 3px;">
              * Note: The student retains their original permanent SSVM Admission Number throughout their entire schooling. Re-admission creates a new session placement and updates demographic details without duplicating identity.
            </div>
          </div>

          <div class="photo-box">
            <span>Affix Recent Passport Size Photograph</span>
            <span style="font-size: 8px; margin-top: 4px;">(Self-attested)</span>
          </div>

          <div style="margin-right: 36mm;">
            <div class="field-row">
              <div class="field-label">1. Student Full Name:</div>
              <div class="field-input-box"></div>
            </div>
            <div class="grid-2">
              <div class="field-row">
                <div class="field-label">2. Date of Birth:</div>
                <div class="field-input-box"></div>
              </div>
              <div class="field-row">
                <div class="field-label">3. Blood Group Confirmation:</div>
                <div class="field-input-box">[ A+ / A- / B+ / B- / AB+ / AB- / O+ / O- ]</div>
              </div>
            </div>
          </div>

          <div class="section-title" style="clear: both;">Academic Continuity & Placement Request</div>
          <div class="grid-2">
            <div style="border: 1px solid #cbd5e1; padding: 8px; border-radius: 3px;">
              <div style="font-weight: 700; font-size: 10px; color: #475569; margin-bottom: 6px;">PREVIOUS ACADEMIC PLACEMENT</div>
              <div class="field-row"><span class="field-label">Previous Academic Session:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Previous Class & Section:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Previous Roll Number:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Annual Exam Result / Status:</span><div class="field-input-box">[ ] Promoted  [ ] Retained  [ ] Gap</div></div>
            </div>

            <div style="border: 1px solid #1e3a8a; padding: 8px; border-radius: 3px; background: #fafafa;">
              <div style="font-weight: 700; font-size: 10px; color: #1e3a8a; margin-bottom: 6px;">REQUESTED RE-ADMISSION PLACEMENT</div>
              <div class="field-row"><span class="field-label">Re-admission Academic Session:</span><div class="field-input-box" style="font-weight: 700;">{{sessionName}}</div></div>
              <div class="field-row"><span class="field-label">Requested Class:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Allocated Section:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Reason for Re-admission / Gap:</span><div class="field-input-box"></div></div>
            </div>
          </div>

          <div class="section-title">Updated Parent / Guardian & Contact Information</div>
          <div class="grid-3">
            <div class="field-row"><span class="field-label">Father's Name & Mobile:</span><div class="field-input-box"></div></div>
            <div class="field-row"><span class="field-label">Mother's Name & Mobile:</span><div class="field-input-box"></div></div>
            <div class="field-row"><span class="field-label">Primary Communication Email:</span><div class="field-input-box"></div></div>
          </div>

          <div class="field-row">
            <div class="field-label">Updated Residential Address (leave blank if unchanged):</div>
            <div class="field-input-box"></div>
          </div>

          <div class="declaration-text">
            <strong>Declaration for Re-admission:</strong> I confirm that the student named above is seeking re-admission to SSVM under their existing student identity. I affirm that all fee dues of previous sessions have been cleared or properly regularized, and no disciplinary record exists against the student.
          </div>

          <div class="signature-area">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div style="font-size: 9px; font-weight: 700;">Date</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div style="font-size: 9px; font-weight: 700;">Signature of Student</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div style="font-size: 9px; font-weight: 700;">Signature of Parent / Guardian</div>
            </div>
          </div>

          <div class="office-use-box">
            <div class="office-title">Office Re-Admission Approval &amp; Verification</div>
            <div class="grid-4" style="font-size: 9.5px;">
              <div><strong>Dues Clearance:</strong> [ ] Cleared</div>
              <div><strong>Allotted Class &amp; Sec:</strong> _____________</div>
              <div><strong>Allotted Roll No:</strong> ________________</div>
              <div><strong>Approval Authority:</strong> ______________</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
              <span style="font-size: 8.5px; color: #64748b;">Physical Office Seal Required</span>
              <span style="font-weight: 700; font-size: 9.5px; color: #1e3a8a;">Application Fee: ₹{{fee}} (Non-refundable)</span>
              <span style="font-size: 9px; font-weight: 700;">Signature of Principal / Incharge</span>
            </div>
          </div>

          <div class="page-footer">
            <span>Form Ref: SSVM-ADM-READM-FORM</span>
            <span>Version: {{version}}</span>
            <span>Printed on: {{printDate}}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const template = handlebars.compile(templateHtml);
    return template({
      schoolName: school?.name || options.schoolName || "Shri Shiksha Vikash Mandir (SSVM)",
      affiliation: school?.code || options.affiliationNumber || "SSVM-ODISHA",
      sessionName,
      fee,
      version,
      formNumber: options.formNumber || "",
      printDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    });
  }

  /**
   * Render Incoming Transfer Admission Paper Form HTML
   */
  public static async renderTransferAdmissionForm(schoolId: string, options: PaperFormOptions = {}): Promise<string> {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const resolved = await this.resolveFormOptions(schoolId, "TRANSFER", options);
    const version = options.formVersion || "v1.0.0-TRANS";
    const sessionName = resolved.sessionName;
    const fee = resolved.fee;
    const formNumber = resolved.formNumber;
    const applicantName = resolved.applicantName;

    const templateHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Incoming Transfer Admission Application Form - {{sessionName}}</title>
        <style>${this.FORM_STYLES}</style>
      </head>
      <body>
        <div class="form-container">
          <div class="fee-notice">Application Fee: ₹{{fee}} (Non-refundable)</div>
          <div class="form-header">
            <div class="institution-name">{{schoolName}}</div>
            <div class="institution-subtitle">Affiliation / Institutional Code: {{affiliation}} | Academic Session: {{sessionName}}</div>
            <div class="form-title-badge" style="background: #065f46;">Incoming Transfer Student Admission Form</div>
          </div>

          <div class="photo-box">
            <span>Affix Recent Passport Size Photograph</span>
            <span style="font-size: 8px; margin-top: 4px;">(Self-attested)</span>
          </div>

          <div style="margin-right: 36mm;">
            <div class="grid-2">
              <div class="field-row">
                <div class="field-label">1. Academic Session:</div>
                <div class="field-input-box" style="font-weight: 700;">{{sessionName}}</div>
              </div>
              <div class="field-row">
                <div class="field-label">2. Class Seeking Admission To:</div>
                <div class="field-input-box" style="font-weight: 700;">[ Class 1 to 12 ]</div>
              </div>
            </div>

            <div class="field-row">
              <div class="field-label">3. Student Full Name:</div>
              <div class="field-input-box"></div>
            </div>
          </div>

          <div class="grid-4" style="clear: both; margin-top: 4px;">
            <div class="field-row">
              <div class="field-label">4. Date of Birth:</div>
              <div class="field-input-box"></div>
            </div>
            <div class="field-row">
              <div class="field-label">5. Gender:</div>
              <div class="field-input-box">[ ] Male  [ ] Female  [ ] Other</div>
            </div>
            <div class="field-row">
              <div class="field-label">6. Blood Group:</div>
              <div class="field-input-box">[ A+ / A- / B+ / B- / AB+ / AB- / O+ / O- ]</div>
            </div>
            <div class="field-row">
              <div class="field-label">7. PEN Number:</div>
              <div class="field-input-box"></div>
            </div>
          </div>

          <div class="section-title">Previous Institution & Transfer Certificate (TC) Details</div>
          <div style="border: 1.5px solid #065f46; padding: 8px; background: #f0fdf4; border-radius: 4px; margin-bottom: 6px;">
            <div class="grid-2">
              <div class="field-row"><span class="field-label">Previous School Name *:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Affiliated Board (CBSE / ICSE / State Board):</span><div class="field-input-box"></div></div>
            </div>

            <div class="grid-4" style="margin-top: 4px;">
              <div class="field-row"><span class="field-label">TC / SLC Number *:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">TC Issue Date *:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Previous Class & Section:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Previous Reg / Roll No:</span><div class="field-input-box"></div></div>
            </div>

            <div class="grid-2" style="margin-top: 4px;">
              <div class="field-row"><span class="field-label">Reason for Transfer:</span><div class="field-input-box"></div></div>
              <div class="field-row"><span class="field-label">Date of Leaving Previous School:</span><div class="field-input-box"></div></div>
            </div>

            <div style="font-size: 8.5px; color: #047857; margin-top: 4px; font-style: italic;">
              * Note: The previous school's registration/roll number is archived as historical background and will NOT be used as the SSVM permanent Registration Number. A new monotonic SSVM Admission Number will be allocated.
            </div>
          </div>

          <div class="section-title">Parent / Guardian & Communication Details</div>
          <div class="grid-3">
            <div class="field-row"><span class="field-label">Father's Name & Occupation:</span><div class="field-input-box"></div></div>
            <div class="field-row"><span class="field-label">Mother's Name & Occupation:</span><div class="field-input-box"></div></div>
            <div class="field-row"><span class="field-label">Primary Mobile Phone *:</span><div class="field-input-box"></div></div>
          </div>

          <div class="grid-2">
            <div class="field-row"><span class="field-label">Present Address & PIN:</span><div class="field-input-box"></div></div>
            <div class="field-row"><span class="field-label">Permanent Address & State:</span><div class="field-input-box"></div></div>
          </div>

          <div style="margin-top: 4px; font-size: 9px;">
            <strong>Mandatory Transfer Documents:</strong>
            <span style="margin-left: 6px;">[ ] Original Transfer Certificate (Countersigned)</span>
            <span style="margin-left: 6px;">[ ] Previous Marksheet</span>
            <span style="margin-left: 6px;">[ ] Conduct Certificate</span>
            <span style="margin-left: 6px;">[ ] Birth Certificate</span>
          </div>

          <div class="declaration-text">
            <strong>Parent / Guardian Declaration:</strong> I certify that the student is migrating with a genuine Transfer Certificate and that all statements provided are authentic. I agree that admission will be finalized only after successful offline verification of the original TC by the Admission Incharge.
          </div>

          <div class="signature-area">
            <div class="signature-block"><div class="signature-line"></div><div style="font-size: 9px; font-weight: 700;">Date</div></div>
            <div class="signature-block"><div class="signature-line"></div><div style="font-size: 9px; font-weight: 700;">Signature of Student</div></div>
            <div class="signature-block"><div class="signature-line"></div><div style="font-size: 9px; font-weight: 700;">Signature of Parent / Guardian</div></div>
          </div>

          <div class="office-use-box">
            <div class="office-title">Office Transfer Verification &amp; Registration Endorsement</div>
            <div class="grid-4" style="font-size: 9.5px;">
              <div><strong>Original TC Verified:</strong> [ ] Yes  [ ] No</div>
              <div><strong>Allotted Class &amp; Sec:</strong> _____________</div>
              <div><strong>Allotted Roll No:</strong> ________________</div>
              <div><strong>Verified By:</strong> ____________________</div>
            </div>
            <div class="grid-4" style="font-size: 9.5px; margin-top: 4px;">
              <div><strong>Approval Authority:</strong> ______________</div>
              <div><strong>Approval Date:</strong> _________________</div>
              <div><strong>Offline Register Ref:</strong> _______________</div>
              <div><strong>New Admission No:</strong> _______________</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
              <span style="font-size: 8.5px; color: #64748b;">Physical Office Seal Required</span>
              <span style="font-weight: 700; font-size: 9.5px; color: #065f46;">Application Fee: ₹{{fee}} (Non-refundable)</span>
              <span style="font-size: 9px; font-weight: 700;">Signature of Principal / Incharge</span>
            </div>
          </div>

          <div class="page-footer">
            <span>Form Ref: SSVM-ADM-TRANS-FORM</span>
            <span>Version: {{version}}</span>
            <span>Printed on: {{printDate}}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const template = handlebars.compile(templateHtml);
    return template({
      schoolName: school?.name || options.schoolName || "Shri Shiksha Vikash Mandir (SSVM)",
      affiliation: school?.code || options.affiliationNumber || "SSVM-ODISHA",
      sessionName,
      fee,
      version,
      formNumber: options.formNumber || "",
      printDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    });
  }

  /**
   * Universal helper to render any of the three admission forms
   */
  public static async renderForm(
    schoolId: string,
    formType: "NEW" | "READMISSION" | "TRANSFER",
    options: PaperFormOptions = {}
  ): Promise<string> {
    if (formType === "READMISSION") {
      return this.renderReAdmissionForm(schoolId, options);
    }
    if (formType === "TRANSFER") {
      return this.renderTransferAdmissionForm(schoolId, options);
    }
    return this.renderNewAdmissionForm(schoolId, options);
  }
}

