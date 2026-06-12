import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole, optionalAuth } from "../middleware/auth";

const router = Router();

// GET /api/notices
router.get("/", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "20", status, category, search } = req.query as Record<string, string | undefined>;
    const skip = (Math.max(1, +page) - 1) * Math.min(100, +limit);
    const take = Math.min(100, +limit);

    const where: Record<string, unknown> = {};
    if (req.user?.role !== "ADMIN") where.status = "PUBLISHED";
    else if (status) where.status = status;
    if (category) where.category = category;
    if (search) where.title = { contains: search };

    const [data, total] = await Promise.all([
      prisma.notice.findMany({ where, include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.notice.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: take, total, totalPages: Math.ceil(total / take) } });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// POST /api/notices
router.post("/", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, status, expiryDate } = req.body;
    if (!title || !content) { res.status(400).json({ success: false, error: "Title and content required" }); return; }
    const notice = await prisma.notice.create({
      data: { title, content, category: category || "General", status: status || "DRAFT", expiryDate: expiryDate ? new Date(expiryDate) : null, authorId: req.user!.id },
      include: { author: { select: { name: true } } },
    });
    res.status(201).json({ success: true, data: notice });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// GET /api/notices/:id
router.get("/:id", async (req, res: Response) => {
  try {
    const notice = await prisma.notice.findUnique({ where: { id: req.params.id as string }, include: { author: { select: { name: true } } } });
    if (!notice) { res.status(404).json({ success: false, error: "Not found" }); return; }
    await prisma.notice.update({ where: { id: req.params.id as string }, data: { views: { increment: 1 } } });
    res.json({ success: true, data: notice });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// PUT /api/notices/:id
router.put("/:id", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const notice = await prisma.notice.update({
      where: { id: req.params.id as string },
      data: { ...(req.body.title && { title: req.body.title }), ...(req.body.content && { content: req.body.content }), ...(req.body.category && { category: req.body.category }), ...(req.body.status && { status: req.body.status }), ...(req.body.expiryDate !== undefined && { expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null }) },
      include: { author: { select: { name: true } } },
    });
    res.json({ success: true, data: notice });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// DELETE /api/notices/:id
router.delete("/:id", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notice.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: "Deleted" });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

export default router;
