import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fromFile } from "file-type";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";

const uploadDir = path.join(process.cwd(), "uploads", "documents");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX"));
    }
  },
});

const router = Router();

type DocumentRequest = AuthRequest & { user?: AuthRequest["user"] & { studentId?: string; teacherId?: string } };

async function canAccessDocument(req: DocumentRequest, document: { schoolId: string; studentId: string | null; teacherId: string | null }) {
  if (req.user?.role === "SUPER_ADMIN") return true;
  if (!req.user?.schoolId || document.schoolId !== req.user.schoolId) return false;
  if (req.user.role === "STUDENT") return document.studentId === (req.user.studentId || req.user.id);
  if (req.user.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.user.id, schoolId: req.user.schoolId }, select: { id: true } });
    return Boolean(teacher && document.teacherId === teacher.id);
  }
  if (req.user.role === "PARENT") {
    if (!document.studentId) return false;
    const guardian = await prisma.guardian.findFirst({ where: { userId: req.user.id, schoolId: req.user.schoolId }, select: { id: true } });
    if (!guardian) return false;
    return Boolean(await prisma.student.findFirst({ where: { id: document.studentId, schoolId: req.user.schoolId, guardianId: guardian.id }, select: { id: true } }));
  }
  return ["ADMIN", "ERP_ADMIN", "WEBSITE_ADMIN", "ACCOUNTANT", "HR", "LIBRARIAN", "ASSET_MANAGER"].includes(req.user.role);
}

router.get("/:id/download", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const document = await prisma.documentRepository.findUnique({ where: { id: req.params.id as string } });
    if (!document || !(await canAccessDocument(req, document))) {
      res.status(404).json({ success: false, error: "Document not found" });
      return;
    }
    const fileName = path.basename(document.fileUrl || "");
    const documentRoot = path.resolve(uploadDir);
    const filePath = path.resolve(documentRoot, fileName);
    if (!fileName || !filePath.startsWith(`${documentRoot}${path.sep}`) || !fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: "Document file not found" });
      return;
    }
    res.type(document.fileType || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName.replace(/["\\\r\n]/g, "_")}"`);
    res.sendFile(filePath);
  } catch (error) {
    logger.error({ err: error }, "Document download failed");
    res.status(500).json({ success: false, error: "Unable to download document" });
  }
});

// GET /api/documents - List documents (scoped by ownerType + ownerId or category)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ownerType, ownerId, category, studentId, teacherId } = req.query;
    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(403).json({ success: false, error: "School scope required" });

    const where: Prisma.DocumentRepositoryWhereInput = { schoolId };
    
    // Filter by owner type and ID if provided
    if (studentId) where.studentId = studentId as string;
    if (teacherId) where.teacherId = teacherId as string;
    if (category) where.category = category as string;
    if (ownerId && ownerType === "STUDENT") where.studentId = ownerId as string;
    if (ownerId && ownerType === "TEACHER") where.teacherId = ownerId as string;

    // Role-based access control
    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = (req as DocumentRequest).user?.studentId || req.user!.id;
      if (!studentIdFromToken) {
        return res.status(400).json({ success: false, error: 'Student ID not found in token' });
      }
      where.studentId = studentIdFromToken;
    }
    if (req.user!.role === "TEACHER") {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id, schoolId }, select: { id: true } });
      where.teacherId = teacher?.id || "__no_teacher_access__";
    }
    if (req.user!.role === "PARENT") {
      const guardian = await prisma.guardian.findFirst({ where: { userId: req.user!.id, schoolId }, select: { id: true } });
      const children = guardian ? await prisma.student.findMany({ where: { schoolId, guardianId: guardian.id }, select: { id: true } }) : [];
      where.studentId = { in: children.map(child => child.id) };
    }

    const documents = await prisma.documentRepository.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: documents.map((document) => ({ ...document, fileUrl: `/api/v1/documents/${document.id}/download` })) });
  } catch (e) {
    logger.error({ err: e }, "List documents error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/documents/upload - Upload document
router.post("/upload", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN", "WEBSITE_ADMIN", "TEACHER"), upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    const { name, category, studentId, teacherId, expiryDate } = req.body;
    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(403).json({ success: false, error: "School scope required" });

    if (!file || typeof name !== "string" || !name.trim() || typeof category !== "string" || !category.trim()) {
      if (file) await fs.promises.unlink(file.path).catch(() => undefined);
      return res.status(400).json({ success: false, error: "File, name, and category are required" });
    }

    if (Boolean(studentId) === Boolean(teacherId) || (studentId && typeof studentId !== "string") || (teacherId && typeof teacherId !== "string")) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      return res.status(400).json({ success: false, error: "Provide exactly one studentId or teacherId" });
    }
    if (req.user!.role === "TEACHER" && studentId) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      return res.status(403).json({ success: false, error: "Teachers may only upload their own documents" });
    }

    const owner = studentId
      ? await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true } })
      : await prisma.teacher.findFirst({ where: { id: teacherId, schoolId, ...(req.user!.role === "TEACHER" ? { userId: req.user!.id } : {}) }, select: { id: true } });
    if (!owner) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      return res.status(404).json({ success: false, error: "Document owner not found in this school" });
    }

    const detected = await fromFile(file.path);
    const declaredMime = file.mimetype;
    const mimeMatches = detected?.mime === declaredMime || (declaredMime === "application/msword" && detected?.mime === "application/x-cfb");
    const extension = path.extname(file.originalname).slice(1).toLowerCase();
    const extensionMatches = detected?.ext === extension || (detected?.ext === "jpg" && extension === "jpeg") || (detected?.ext === "cfb" && extension === "doc");
    if (!detected || !mimeMatches || !extensionMatches) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      return res.status(400).json({ success: false, error: "File content does not match an allowed document type" });
    }

    // Store only the private storage key. The public response contains the
    // authenticated download endpoint instead of a static file location.
    const fileUrl = file.filename;

    const document = await prisma.documentRepository.create({
      data: {
        schoolId,
        studentId: studentId || null,
        teacherId: teacherId || null,
        category,
        name,
        fileUrl,
        fileType: detected.mime,
        sizeBytes: file.size,
        uploadedById: req.user!.id,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    logger.info({ documentId: document.id, category, uploadedBy: req.user!.id }, "Document uploaded");
    res.status(201).json({ success: true, data: { ...document, fileUrl: `/api/v1/documents/${document.id}/download` } });
  } catch (e) {
    logger.error({ err: e }, "Document upload error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/documents/:id - Get single document + metadata
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const document = await prisma.documentRepository.findUnique({
      where: { id: id as string },
    });

    if (!document || !(await canAccessDocument(req, document))) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    res.json({ success: true, data: { ...document, fileUrl: `/api/v1/documents/${document.id}/download` } });
  } catch (e) {
    logger.error({ err: e }, "Get document error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/documents/:id - Delete document (Admin only)
router.delete("/:id", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const document = await prisma.documentRepository.findUnique({
      where: { id: id as string },
    });

    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    if (!(await canAccessDocument(req, document))) return res.status(404).json({ success: false, error: "Document not found" });

    // Delete physical file
    if (document.fileUrl) {
      const filePath = path.resolve(uploadDir, path.basename(document.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.documentRepository.delete({ where: { id: id as string } });

    logger.info({ documentId: id, deletedBy: req.user!.id }, "Document deleted");
    res.json({ success: true, data: { message: "Document deleted successfully" } });
  } catch (e) {
    logger.error({ err: e }, "Delete document error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/documents/:id/verify - Mark document as verified (Admin only)
router.put("/:id/verify", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.documentRepository.findUnique({ where: { id: id as string } });
    if (!existing || !(await canAccessDocument(req, existing))) return res.status(404).json({ success: false, error: "Document not found" });
    const { isVerified } = req.body;

    const document = await prisma.documentRepository.update({
      where: { id: id as string },
      data: { isVerified: isVerified !== undefined ? isVerified : true },
    });

    logger.info({ documentId: id, verifiedBy: req.user!.id }, "Document verification status updated");
    res.json({ success: true, data: document });
  } catch (e) {
    logger.error({ err: e }, "Verify document error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
