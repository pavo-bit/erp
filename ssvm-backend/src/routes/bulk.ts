import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAdmin, hashPassword } from "../middleware/auth";
import { enqueueImport } from "../jobs/queue";
import { storageService } from "../services/storage.service";
import { v4 as uuidv4 } from "uuid";
import Papa from "papaparse";
import { sendSuccess, sendError } from "../lib/response";

const router = Router();

// POST /api/bulk/upload
router.post("/upload", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { type, data } = req.body;
    const { action } = req.query;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;

    if (!schoolId) {
      res.status(400).json({ success: false, error: "School ID required" }); return;
    }
    if (!type || !Array.isArray(data) || data.length === 0) {
      res.status(400).json({ success: false, error: "Invalid payload: 'type' and non-empty 'data' array are required" }); return;
    }

    const isValidationPhase = action === "validate";
    const report: Array<{ row: number; status: "SUCCESS" | "ERROR" | "WARNING"; message: string }> = [];
    let insertedCount = 0;

    if (type === "students") {
      const existingRollNos = new Set((await prisma.student.findMany({ where: { schoolId }, select: { rollNo: true } })).map(s => s.rollNo));
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row.Name || !row.RollNo || !row.Class) {
          if (isValidationPhase) report.push({ row: i + 1, status: "ERROR", message: "Missing required fields (Name, RollNo, Class)" });
          continue;
        }

        if (existingRollNos.has(String(row.RollNo))) {
          if (isValidationPhase) report.push({ row: i + 1, status: "ERROR", message: `Duplicate Roll Number: ${row.RollNo}` });
          if (!isValidationPhase) continue;
        }

        const clsName = String(row.Class);
        const secName = String(row.Section || "A");

        const sectionRecord = await prisma.section.findFirst({
          where: { name: secName, class: { name: clsName, schoolId: schoolId } }
        });

        if (!sectionRecord && isValidationPhase) {
          report.push({ row: i + 1, status: "WARNING", message: `Section '${secName}' in Class '${clsName}' not found. Will be imported without section binding.` });
        } else if (isValidationPhase) {
          report.push({ row: i + 1, status: "SUCCESS", message: "Valid" });
        }

        if (!isValidationPhase) {
          const finalAdmissionNo = row.AdmissionNo ? String(row.AdmissionNo) : `ADM${Math.floor(100000 + Math.random() * 900000)}`;
          const plainPassword = row.Password ? String(row.Password) : `SSVM@${Math.floor(1000 + Math.random() * 9000)}`;
          const hashedPassword = await hashPassword(plainPassword);

          await prisma.student.create({
            data: {
              school: { connect: { id: schoolId } },
              name: String(row.Name),
              rollNo: String(row.RollNo),
              admissionNo: finalAdmissionNo,
              password: hashedPassword,
              sectionRef: sectionRecord ? { connect: { id: sectionRecord.id } } : undefined,
              guardian: {
                create: {
                  schoolId: schoolId,
                  primaryName: String(row.GuardianName || row.Name + " Parent"),
                  primaryPhone: String(row.Phone || "0000000000"),
                }
              }
            }
          });
          existingRollNos.add(String(row.RollNo));
          insertedCount++;
        }
      }
    } else if (type === "teachers") {
      const existingEmails = new Set((await prisma.user.findMany({ where: { schoolId, role: "TEACHER" }, select: { email: true } })).map(u => u.email));

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row.Name || !row.Email || !row.Department) {
          if (isValidationPhase) report.push({ row: i + 1, status: "ERROR", message: "Missing required fields (Name, Email, Department)" });
          continue;
        }
        
        if (existingEmails.has(String(row.Email))) {
          if (isValidationPhase) report.push({ row: i + 1, status: "ERROR", message: `Duplicate Email: ${row.Email}` });
          if (!isValidationPhase) continue;
        } else if (isValidationPhase) {
          report.push({ row: i + 1, status: "SUCCESS", message: "Valid" });
        }

        if (!isValidationPhase) {
          await prisma.user.create({
            data: {
              email: String(row.Email),
              password: "hashedpassword_csv_default",
              name: String(row.Name),
              role: "TEACHER",
              schoolId,
              teacher: {
                create: {
                  schoolId,
                  departmentId: String(row.Department), // Note: Should validate department existence ideally
                  designation: String(row.Designation || "Teacher"),
                  experience: String(row.Experience || "0"),
                  joiningDate: new Date(),
                }
              }
            }
          });
          existingEmails.add(String(row.Email));
          insertedCount++;
        }
      }
    } else if (type === "invoices") {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row.StudentId || !row.Amount) {
          if (isValidationPhase) report.push({ row: i + 1, status: "ERROR", message: "Missing required fields (StudentId, Amount)" });
          continue;
        }

        if (isNaN(parseFloat(row.Amount))) {
          if (isValidationPhase) report.push({ row: i + 1, status: "ERROR", message: `Invalid Amount: ${row.Amount}` });
          if (!isValidationPhase) continue;
        } else if (isValidationPhase) {
          report.push({ row: i + 1, status: "SUCCESS", message: "Valid" });
        }

        if (!isValidationPhase) {
          await prisma.invoice.create({
            data: {
              schoolId,
              studentId: String(row.StudentId),
              amount: parseFloat(row.Amount),
              amountPaid: 0,
              remainingAmount: parseFloat(row.Amount),
              type: "MONTHLY",
              status: "PENDING",
              dueDate: new Date(row.DueDate || new Date().toISOString())
            }
          });
          insertedCount++;
        }
      }
    } else {
      res.status(400).json({ success: false, error: "Unsupported upload type" }); return;
    }

    if (isValidationPhase) {
      return sendSuccess(res, { report, total: data.length, validCount, errorCount });
    }

    // ─── ASYNCHRONOUS IMPORT PHASE (BullMQ) ───
    
    // Convert JSON array back to CSV for storage
    const csvContent = Papa.unparse(data);
    const fileBuffer = Buffer.from(csvContent, "utf-8");

    // Upload to secure storage
    const fileKey = await storageService.uploadFile(fileBuffer, "text/csv", `import-${uuidv4()}.csv`, "imports/pending");

    // Map frontend type to backend type
    const jobTypeMap: Record<string, string> = {
      "students": "STUDENT_IMPORT",
      "teachers": "TEACHER_IMPORT",
      "invoices": "INVOICE_IMPORT",
      "admissions": "ADMISSION_IMPORT"
    };

    const importType = jobTypeMap[type] || "UNKNOWN_IMPORT";

    // Create DB tracking record
    const bulkJob = await prisma.bulkJob.create({
      data: {
        schoolId,
        type: importType,
        status: "QUEUED",
        totalRows: data.length,
      }
    });

    // Enqueue to BullMQ
    await enqueueImport({
      jobId: bulkJob.id,
      fileKey,
      schoolId,
      type: importType
    });

    return sendSuccess(res, { 
      message: "Import job queued successfully",
      jobId: bulkJob.id 
    });
  } catch (e: any) {
    logger.error({ err: e }, "Bulk upload error");
    res.status(500).json({ success: false, error: "Server error during bulk upload" });
  }
});

// GET /api/v1/bulk/jobs
// List import jobs for dashboard
router.get("/jobs", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    if (!schoolId) return sendError(res, 400, "School ID required");

    const jobs = await prisma.bulkJob.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return sendSuccess(res, jobs);
  } catch (e: any) {
    return sendError(res, 500, "Failed to fetch bulk jobs");
  }
});

// GET /api/v1/bulk/jobs/:id
// Poll for specific job status
router.get("/jobs/:id", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.bulkJob.findUnique({
      where: { id: req.params.id }
    });

    if (!job) return sendError(res, 404, "Job not found");

    // If there's an error file, generate a signed URL
    let errorFileUrl = null;
    if (job.errorFile) {
      errorFileUrl = await storageService.generateSignedUrl(job.errorFile, 3600);
    }

    return sendSuccess(res, { ...job, errorFileUrl });
  } catch (e: any) {
    return sendError(res, 500, "Failed to fetch job status");
  }
});

export default router;
