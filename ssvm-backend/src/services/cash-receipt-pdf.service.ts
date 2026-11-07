import QRCode from "qrcode";
import handlebars from "handlebars";
import puppeteer from "puppeteer";
import { amountToWordsIndianRupees } from "../lib/amount-to-words";
import { CashCollectionService } from "./cash-collection.service";
import logger from "../lib/logger";

export const officialReceiptHtmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Fee Receipt - {{receiptNo}}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      color: #1e293b;
      line-height: 1.5;
      background: #ffffff;
      padding: 20px;
    }
    .watermark {
      position: absolute;
      top: 35%;
      left: 10%;
      right: 10%;
      text-align: center;
      transform: rotate(-30deg);
      font-size: 60px;
      font-weight: 900;
      color: rgba(239, 68, 68, 0.12);
      text-transform: uppercase;
      letter-spacing: 12px;
      pointer-events: none;
      z-index: 100;
    }
    .receipt-container {
      border: 2px solid #0f172a;
      padding: 24px;
      position: relative;
    }
    .school-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .school-info {
      flex: 1;
      text-align: center;
    }
    .school-name {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .school-meta {
      font-size: 11px;
      color: #475569;
      margin-top: 4px;
    }
    .receipt-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 4px 14px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-radius: 4px;
      margin-top: 8px;
    }
    .duplicate-pill {
      background: #ef4444 !important;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      margin-left: 8px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .meta-row {
      display: flex;
      margin-bottom: 4px;
    }
    .meta-label {
      width: 140px;
      font-weight: 600;
      color: #475569;
    }
    .meta-value {
      flex: 1;
      font-weight: 700;
      color: #0f172a;
    }
    table.fee-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.fee-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 8px 10px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.fee-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-size: 12px;
    }
    table.fee-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .total-section {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .grand-total {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      margin-top: 6px;
    }
    .words-block {
      margin-top: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #1e3a8a;
      background: #e0e7ff;
      padding: 6px 10px;
      border-radius: 4px;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 140px 1fr 180px;
      gap: 16px;
      align-items: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px dashed #94a3b8;
    }
    .qr-container {
      text-align: center;
    }
    .qr-code {
      width: 100px;
      height: 100px;
    }
    .qr-caption {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    .disclaimer-block {
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
      padding: 0 10px;
    }
    .seal-sign-block {
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-top: 40px;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .reprint-audit {
      margin-top: 12px;
      font-size: 10px;
      color: #dc2626;
      font-weight: 600;
      text-align: center;
    }
    @media print {
      body {
        padding: 0;
      }
      .receipt-container {
        border: 2px solid #000;
      }
    }
  </style>
</head>
<body>
  {{#if isDuplicate}}
  <div class="watermark">DUPLICATE COPY</div>
  {{/if}}

  <div class="receipt-container">
    <div class="school-header">
      <div class="school-info">
        <div class="school-name">{{school.name}}</div>
        <div class="school-meta">
          {{#if school.address}}{{school.address}} &bull; {{/if}}
          {{#if school.phone}}Phone: {{school.phone}} &bull; {{/if}}
          {{#if school.email}}Email: {{school.email}}{{/if}}
        </div>
        <div style="margin-top: 8px;">
          <span class="receipt-badge">OFFICIAL FEE RECEIPT</span>
          {{#if isDuplicate}}
          <span class="duplicate-pill">DUPLICATE COPY ({{reprintCount}})</span>
          {{/if}}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="meta-row">
          <span class="meta-label">Receipt No:</span>
          <span class="meta-value">{{receiptNo}}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date & Time:</span>
          <span class="meta-value">{{paidDateFormatted}}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Payment Mode:</span>
          <span class="meta-value">{{paymentMethod}}</span>
        </div>
        {{#if instrumentDetails}}
        <div class="meta-row">
          <span class="meta-label">Instrument Details:</span>
          <span class="meta-value">{{instrumentDetails}}</span>
        </div>
        {{/if}}
        <div class="meta-row">
          <span class="meta-label">Cashier / Staff:</span>
          <span class="meta-value">{{cashierName}}</span>
        </div>
      </div>
      <div>
        <div class="meta-row">
          <span class="meta-label">Student Name:</span>
          <span class="meta-value">{{student.name}}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Admission No:</span>
          <span class="meta-value">{{student.admissionNo}}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Class & Section:</span>
          <span class="meta-value">{{student.className}} {{#if student.sectionName}}- {{student.sectionName}}{{/if}}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Roll Number:</span>
          <span class="meta-value">{{#if student.rollNo}}{{student.rollNo}}{{else}}N/A{{/if}}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Parent / Guardian:</span>
          <span class="meta-value">{{#if student.guardianName}}{{student.guardianName}}{{else}}N/A{{/if}}</span>
        </div>
      </div>
    </div>

    <table class="fee-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Fee Description</th>
          <th class="text-right">Previous Balance</th>
          <th class="text-right">Principal Paid</th>
          <th class="text-right">Fine Paid</th>
          <th class="text-right">Amount Paid</th>
          <th class="text-right">Balance Due</th>
        </tr>
      </thead>
      <tbody>
        {{#each allocations}}
        <tr>
          <td class="text-center">{{@index}}</td>
          <td>
            <strong>{{description}}</strong>
            <div style="font-size: 10px; color: #64748b;">Due Date: {{dueDate}} &bull; Status: {{newStatus}}</div>
          </td>
          <td class="text-right">&#8377;{{previousBalance}}</td>
          <td class="text-right">&#8377;{{principalPaid}}</td>
          <td class="text-right">&#8377;{{finePaid}}</td>
          <td class="text-right" style="font-weight: 700; color: #0f172a;">&#8377;{{allocatedAmount}}</td>
          <td class="text-right">&#8377;{{remainingBalance}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <span>Total Fee Allocated:</span>
        <span style="font-weight: 700;">&#8377;{{totalAllocated}}</span>
      </div>
      {{#if hasAdvanceCredit}}
      <div class="total-row" style="color: #166534;">
        <span>Advance Fee Credit Deposited:</span>
        <span style="font-weight: 700;">&#8377;{{advanceCreditAmount}}</span>
      </div>
      {{/if}}
      <div class="total-row grand-total">
        <span>Total Amount Received:</span>
        <span>&#8377;{{totalAmount}}</span>
      </div>
      <div class="words-block">
        <strong>Amount in Words:</strong> {{amountInWords}}
      </div>
    </div>

    <div class="footer-grid">
      <div class="qr-container">
        {{#if qrCodeDataUrl}}
        <img src="{{qrCodeDataUrl}}" alt="QR Verification" class="qr-code" />
        <div class="qr-caption">Scan to Verify</div>
        {{/if}}
      </div>
      <div class="disclaimer-block">
        <p>1. This receipt is an official acknowledgment of payment received by the institution.</p>
        <p>2. Fees once paid are non-refundable and non-transferable under school policies.</p>
        <p>3. Please preserve this receipt for future academic and tax records.</p>
        <p>4. Computer-generated official document. No unauthorized alterations allowed.</p>
      </div>
      <div class="seal-sign-block">
        <div class="signature-line">
          Authorized Cashier Signatory
        </div>
      </div>
    </div>

    {{#if isDuplicate}}
    <div class="reprint-audit">
      * DUPLICATE COPY reprinted on {{lastReprintedAtFormatted}} by staff ID {{lastReprintedById}} (Reprint Count: {{reprintCount}}). Original issued on {{paidDateFormatted}}.
    </div>
    {{/if}}
  </div>
</body>
</html>
`;

export class CashReceiptPdfService {
  /**
   * Prepares the complete rendering model for the receipt
   */
  static async prepareReceiptRenderData(schoolId: string, receiptId: string) {
    const receipt = await CashCollectionService.getReceiptById(schoolId, receiptId);
    const metadata = (receipt.metadataSnapshot || {}) as Record<string, any>;

    const schoolInfo = metadata.school || {
      name: receipt.school.name,
      code: receipt.school.code,
      address: receipt.school.address,
      phone: receipt.school.phone,
      email: receipt.school.email,
    };

    const studentInfo = metadata.student || {
      name: receipt.student.name,
      admissionNo: receipt.student.admissionNo,
      rollNo: receipt.student.rollNo,
      className: receipt.student.sectionRef?.class?.name || "N/A",
      sectionName: receipt.student.sectionRef?.name || "N/A",
      guardianName: receipt.student.guardian?.primaryName || "N/A",
    };

    const allocations = receipt.allocations.map((a, idx) => ({
      index: idx + 1,
      description: a.invoice?.description || `${a.invoice?.type || "Fee"} Invoice`,
      dueDate: a.invoice?.dueDate ? new Date(a.invoice.dueDate).toISOString().split("T")[0] : "N/A",
      previousBalance: a.previousBalance.toString(),
      principalPaid: a.principalPaid.toString(),
      finePaid: a.finePaid.toString(),
      allocatedAmount: a.allocatedAmount.toString(),
      remainingBalance: a.remainingBalance.toString(),
      newStatus: a.remainingBalance.toNumber() === 0 ? "PAID" : "PARTIAL",
    }));

    const totalAllocatedNum = receipt.allocations.reduce(
      (sum, a) => sum + a.allocatedAmount.toNumber(),
      0
    );
    const totalAmountNum = receipt.totalAmount.toNumber();
    const advanceCreditNum = Math.max(0, totalAmountNum - totalAllocatedNum);

    // Instrument details string
    let instrumentDetails = "";
    if (receipt.paymentMethod === "CHEQUE") {
      instrumentDetails = `Cheque No: ${receipt.instrumentNo || "N/A"} | Bank: ${receipt.issuingBank || "N/A"}`;
      if (receipt.instrumentDate) {
        instrumentDetails += ` | Date: ${new Date(receipt.instrumentDate).toISOString().split("T")[0]}`;
      }
    } else if (receipt.paymentMethod === "COUNTER_UPI" || receipt.paymentMethod === "BANK_TRANSFER") {
      instrumentDetails = `Ref / UTR: ${receipt.instrumentNo || "N/A"}`;
    }

    // QR Code payload for offline authenticity verification
    const qrPayload = {
      receiptNo: receipt.receiptNo,
      schoolId: receipt.schoolId,
      studentAdmissionNo: studentInfo.admissionNo,
      amount: receipt.totalAmount.toString(),
      paymentMethod: receipt.paymentMethod,
      date: receipt.paidAt.toISOString(),
      cashier: receipt.cashierName,
      hash: `${receipt.receiptNo}:${studentInfo.admissionNo}:${receipt.totalAmount}`,
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      width: 140,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    const isDuplicate = receipt.reprintCount > 0;

    return {
      receiptNo: receipt.receiptNo,
      school: schoolInfo,
      student: studentInfo,
      allocations,
      totalAllocated: totalAllocatedNum.toFixed(2),
      advanceCreditAmount: advanceCreditNum.toFixed(2),
      hasAdvanceCredit: advanceCreditNum > 0,
      totalAmount: totalAmountNum.toFixed(2),
      amountInWords: amountToWordsIndianRupees(receipt.totalAmount),
      paymentMethod: receipt.paymentMethod,
      instrumentDetails: instrumentDetails || null,
      cashierName: receipt.cashierName,
      paidDateFormatted: new Date(receipt.paidAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }),
      isDuplicate,
      reprintCount: receipt.reprintCount,
      lastReprintedAtFormatted: receipt.lastReprintedAt
        ? new Date(receipt.lastReprintedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null,
      lastReprintedById: receipt.lastReprintedById,
      qrCodeDataUrl,
    };
  }

  /**
   * Render complete HTML document for receipt
   */
  static async renderReceiptHtml(schoolId: string, receiptId: string): Promise<string> {
    const data = await this.prepareReceiptRenderData(schoolId, receiptId);
    const template = handlebars.compile(officialReceiptHtmlTemplate);
    return template(data);
  }

  /**
   * Generate official PDF buffer using puppeteer
   */
  static async generateReceiptPdf(schoolId: string, receiptId: string): Promise<Buffer> {
    const html = await this.renderReceiptHtml(schoolId, receiptId);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (err) {
      logger.error({ err, receiptId }, "Puppeteer PDF generation failed, returning HTML fallback");
      throw err;
    }
  }
}
