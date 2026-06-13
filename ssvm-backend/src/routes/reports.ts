import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import puppeteer from "puppeteer";
import handlebars from "handlebars";
import { Parser } from "json2csv";
import { Queue } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";

const router = Router();
const env = getEnv();

// Export the PDF Queue so it can be reused or inspected
export const pdfQueue = env.REDIS_URL ? new Queue("PDF_QUEUE", { connection: { url: env.REDIS_URL } }) : null;

// Define default HTML templates for Receipts and Report Cards
export const defaultReceiptTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { max-width: 100px; max-height: 100px; }
    .school-name { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 10px 0 5px; }
    .title { font-size: 18px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .details div { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #475569; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .total-row { font-weight: bold; font-size: 18px; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; }
    .signature { margin-top: 50px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    {{#if schoolLogo}}<img src="{{schoolLogo}}" class="logo"/>{{/if}}
    <div class="school-name">{{schoolName}}</div>
    <div class="title">Fee Receipt</div>
  </div>
  
  <div class="details">
    <div>
      <p><strong>Receipt No:</strong> {{receiptNo}}</p>
      <p><strong>Date:</strong> {{date}}</p>
      <p><strong>Status:</strong> {{status}}</p>
    </div>
    <div style="text-align: right;">
      <p><strong>Student Name:</strong> {{studentName}}</p>
      <p><strong>Admission No:</strong> {{admissionNo}}</p>
      <p><strong>Class:</strong> {{className}}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{name}}</td>
        <td style="text-align: right;">{{amount}}</td>
      </tr>
      {{/each}}
      <tr class="total-row">
        <td>Total Paid</td>
        <td style="text-align: right;">₹{{totalAmount}}</td>
      </tr>
    </tbody>
  </table>

  <div class="signature">
    <p>_________________________</p>
    <p>Authorized Signatory</p>
  </div>

  <div class="footer">
    <p>This is a computer-generated document. No signature is required.</p>
  </div>
</body>
</html>
`;

export const defaultReportCardTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; }
    .header { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
    .school-name { font-size: 28px; font-weight: bold; color: #312e81; margin-bottom: 5px; }
    .title { font-size: 20px; color: #4338ca; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
    .student-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #4f46e5; color: white; text-align: left; padding: 12px; font-size: 14px; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .row-alt { background: #f8fafc; }
    .summary { display: flex; justify-content: space-around; background: #eef2ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .summary-item { text-align: center; }
    .summary-val { font-size: 24px; font-weight: bold; color: #4338ca; }
    .remarks { margin-top: 30px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; font-style: italic; }
    .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
    .sig-line { border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">{{schoolName}}</div>
    <p>{{schoolAddress}}</p>
    <div class="title">Academic Report Card</div>
    <p>{{examName}} - {{academicSession}}</p>
  </div>
  
  <div class="student-info">
    <div class="info-grid">
      <div><strong>Student Name:</strong> {{studentName}}</div>
      <div><strong>Class/Section:</strong> {{className}}</div>
      <div><strong>Roll No:</strong> {{rollNo}}</div>
      <div><strong>Attendance:</strong> {{attendance}}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th style="text-align: center;">Max Marks</th>
        <th style="text-align: center;">Marks Obtained</th>
        <th style="text-align: center;">Grade</th>
      </tr>
    </thead>
    <tbody>
      {{#each subjects}}
      <tr class="{{#if @odd}}row-alt{{/if}}">
        <td><strong>{{name}}</strong></td>
        <td style="text-align: center;">{{maxMarks}}</td>
        <td style="text-align: center;">{{marksObtained}}</td>
        <td style="text-align: center;"><strong>{{grade}}</strong></td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-item">
      <div>Total Marks</div>
      <div class="summary-val">{{totalMarks}} / {{maxTotal}}</div>
    </div>
    <div class="summary-item">
      <div>Percentage</div>
      <div class="summary-val">{{percentage}}%</div>
    </div>
    <div class="summary-item">
      <div>Final Grade</div>
      <div class="summary-val">{{finalGrade}}</div>
    </div>
  </div>

  <div class="remarks">
    <strong>Class Teacher's Remarks:</strong><br/>
    {{remarks}}
  </div>

  <div class="signatures">
    <div class="sig-line">Class Teacher</div>
    <div class="sig-line">Principal</div>
    <div class="sig-line">Parent / Guardian</div>
  </div>
</body>
</html>
`;

/**
 * Generate a PDF from a given template and data
 */
export async function generatePDF(templateString: string, data: any): Promise<Buffer> {
  const template = handlebars.compile(templateString);
  const html = template(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}

// ---------------------------------------------------------
// ROUTES
// ---------------------------------------------------------

// GENERATE RECEIPT PDF (ASYNC QUEUE)
router.post("/generate/receipt", authenticate, requireRole("ADMIN", "PARENT"), async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.body;
    
    if (pdfQueue) {
      const job = await pdfQueue.add("generate-receipt", {
        type: "receipt",
        invoiceId,
        userId: req.user!.id,
        schoolId: req.user!.schoolId,
      });
      res.json({ success: true, data: { jobId: job.id, message: "PDF generation queued. You will be notified via SSE." } });
      return;
    }

    // Fallback if no Redis (synchronous)
    const data = {
      schoolName: "SSVM College Square",
      schoolLogo: "", // Optional base64
      receiptNo: invoiceId || "REC-26-001",
      date: new Date().toLocaleDateString(),
      status: "PAID",
      studentName: "Aarav Sharma",
      admissionNo: "ADM-1024",
      className: "Class X-A",
      items: [
        { name: "Tuition Fee (Q3)", amount: 3000 },
        { name: "Transport Fee", amount: 1000 },
        { name: "Lab Fee", amount: 500 }
      ],
      totalAmount: 4500
    };

    const pdfBuffer = await generatePDF(defaultReceiptTemplate, data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receipt-${data.receiptNo}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    logger.error({ err: e }, "PDF Generation Error");
    res.status(500).json({ success: false, error: "Failed to queue PDF generation" });
  }
});

// GENERATE REPORT CARD PDF (ASYNC QUEUE)
router.post("/generate/report-card", authenticate, requireRole("ADMIN", "TEACHER", "PARENT"), async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, examId } = req.body;

    if (pdfQueue) {
      const job = await pdfQueue.add("generate-report-card", {
        type: "report-card",
        studentId,
        examId,
        userId: req.user!.id,
        schoolId: req.user!.schoolId,
      });
      res.json({ success: true, data: { jobId: job.id, message: "PDF generation queued. You will be notified via SSE." } });
      return;
    }

    // Fallback if no Redis (synchronous)
    const data = {
      schoolName: "SSVM College Square",
      schoolAddress: "123 Education Hub, Knowledge City",
      examName: "Term 1 Final Examination",
      academicSession: "2026-2027",
      studentName: "Aarav Sharma",
      className: "Class X-A",
      rollNo: "12",
      attendance: "94.5%",
      subjects: [
        { name: "Mathematics", maxMarks: 100, marksObtained: 95, grade: "A+" },
        { name: "Science", maxMarks: 100, marksObtained: 88, grade: "A" },
        { name: "English", maxMarks: 100, marksObtained: 92, grade: "A+" },
        { name: "Social Studies", maxMarks: 100, marksObtained: 89, grade: "A" },
        { name: "Hindi", maxMarks: 100, marksObtained: 98, grade: "A+" }
      ],
      totalMarks: 462,
      maxTotal: 500,
      percentage: "92.4",
      finalGrade: "A+",
      remarks: "Aarav is an outstanding student who actively participates in class. Keep up the excellent work!"
    };

    const pdfBuffer = await generatePDF(defaultReportCardTemplate, data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ReportCard-${data.studentName.replace(/\s+/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    logger.error({ err: e }, "PDF Generation Error");
    res.status(500).json({ success: false, error: "Failed to queue PDF generation" });
  }
});

// EXPORT ATTENDANCE CSV
router.get("/export/attendance", authenticate, requireRole("ADMIN", "TEACHER"), async (req: AuthRequest, res: Response) => {
  try {
    const { classId, dateStr } = req.query;
    
    // Mock data for demonstration, normally fetched from DB
    const mockData = [
      { studentName: "Aarav Sharma", rollNo: "12", date: "2026-10-15", status: "PRESENT", remarks: "" },
      { studentName: "Diya Sharma", rollNo: "14", date: "2026-10-15", status: "ABSENT", remarks: "Sick leave" },
      { studentName: "Rohan Kumar", rollNo: "15", date: "2026-10-15", status: "LATE", remarks: "Bus delayed" }
    ];

    const fields = ['studentName', 'rollNo', 'date', 'status', 'remarks'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(mockData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Attendance_Export.csv"');
    res.send(csv);
  } catch (e) {
    console.error("CSV Export Error:", e);
    res.status(500).json({ success: false, error: "Failed to export CSV" });
  }
});

export default router;
