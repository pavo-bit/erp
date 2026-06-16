import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
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

// GET /api/documents - List documents (scoped by ownerType + ownerId or category)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ownerType, ownerId, category, studentId, teacherId } = req.query;
    const schoolId = req.user!.schoolId!;

    const where: any = { schoolId };
    
    // Filter by owner type and ID if provided
    if (studentId) where.studentId = studentId as string;
    if (teacherId) where.teacherId = teacherId as string;
    if (category) where.category = category as string;

    // Role-based access control
    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = (req.user as any).studentId;
      if (!studentIdFromToken) {
        return res.status(400).json({ success: false, error: 'Student ID not found in token' });
      }
      where.studentId = studentIdFromToken;
    }

    const documents = await prisma.documentRepository.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: documents });
  } catch (e) {
    logger.error({ err: e }, "List documents error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/documents/upload - Upload document
router.post("/upload", authenticate, upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    const { name, category, studentId, teacherId, expiryDate } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!file || !name || !category) {
      return res.status(400).json({ success: false, error: "File, name, and category are required" });
    }

    // Validate that either studentId or teacherId is provided
    if (!studentId && !teacherId) {
      return res.status(400).json({ success: false, error: "Either studentId or teacherId must be provided" });
    }

    const fileUrl = `/uploads/documents/${file.filename}`;

    const document = await prisma.documentRepository.create({
      data: {
        schoolId,
        studentId: studentId || null,
        teacherId: teacherId || null,
        category,
        name,
        fileUrl,
        fileType: file.mimetype,
        sizeBytes: file.size,
        uploadedById: req.user!.id,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    logger.info({ documentId: document.id, category, uploadedBy: req.user!.id }, "Document uploaded");
    res.status(201).json({ success: true, data: document });
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

    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    // Access control: students can only see their own documents
    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = (req.user as any).studentId;
      if (document.studentId !== studentIdFromToken) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    }

    res.json({ success: true, data: document });
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

    // Delete physical file
    if (document.fileUrl) {
      const filePath = path.join(process.cwd(), document.fileUrl);
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
