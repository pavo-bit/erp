import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, requireContentAdmin } from "../middleware/auth";

const uploadDir = path.join(process.cwd(), "uploads", "gallery");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer stores to temp first, then we process with sharp
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
    }
  },
});

const router = Router();

// GET /api/gallery
router.get("/", async (req, res: Response) => {
  try {
    const { category, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
    const take = Math.min(100, +(limit || 50));
    const skip = (Math.max(1, +(page || 1)) - 1) * take;

    const where: Record<string, unknown> = { isPublished: true };
    if (category) where.category = category;

    const [images, total] = await Promise.all([
      prisma.galleryImage.findMany({ where, orderBy: { sortOrder: "asc" }, take, skip }),
      prisma.galleryImage.count({ where }),
    ]);

    res.json({ success: true, data: images, pagination: { page: +(page || 1), limit: take, total } });
  } catch (e) {
    logger.error({ err: e }, "Gallery fetch error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/gallery — with image compression
router.post("/", authenticate, requireContentAdmin(), upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    const { title, category, description } = req.body;
    if (!file || !title) { res.status(400).json({ success: false, error: "Image and title required" }); return; }

    // Compress image with sharp
    const compressedFilename = `opt-${file.filename.replace(path.extname(file.filename), ".webp")}`;
    const compressedPath = path.join(uploadDir, compressedFilename);

    await sharp(file.path)
      .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(compressedPath);

    // Remove original uncompressed file
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      logger.warn({ err, path: file.path }, "Failed to delete temporary uncompressed image");
    }
    const imageUrl = `/uploads/gallery/${compressedFilename}`;
    const image = await prisma.galleryImage.create({
      data: {
        title,
        category: category || "Campus",
        imageUrl,
        description: description || null,
      },
    });

    logger.info({ imageId: image.id, category, title }, "Gallery image uploaded");
    res.status(201).json({ success: true, data: image });
  } catch (e) {
    logger.error({ err: e }, "Gallery upload error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/gallery/:id
router.delete("/:id", authenticate, requireContentAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const img = await prisma.galleryImage.findUnique({ where: { id } });
    if (!img) { res.status(404).json({ success: false, error: "Image not found" }); return; }

    // Delete physical file
    if (img.imageUrl) {
      const fp = path.join(process.cwd(), img.imageUrl);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await prisma.galleryImage.delete({ where: { id } });
    logger.info({ imageId: img.id }, "Gallery image deleted");
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    logger.error({ err: e }, "Gallery delete error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
