import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, requireContentAdmin } from "../middleware/auth";

const router = Router();

// GET /api/events
router.get("/", async (req, res: Response) => {
  try {
    const { page = "1", limit = "20", status, category } = req.query as Record<string, string | undefined>;
    const skip = (Math.max(1, +page) - 1) * Math.min(100, +limit);
    const take = Math.min(100, +limit);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      prisma.event.findMany({ where, include: { creator: { select: { name: true } } }, orderBy: { date: "asc" }, skip, take }),
      prisma.event.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: take, total, totalPages: Math.ceil(total / take) } });
  } catch (e) { logger.error({ err: e }, "Events error"); res.status(500).json({ success: false, error: "Server error" }); }
});

// POST /api/events
router.post("/", authenticate, requireContentAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, endDate, venue, category, status } = req.body;
    if (!title || !date || !venue) { res.status(400).json({ success: false, error: "Title, date, and venue required" }); return; }
    const event = await prisma.event.create({
      data: { title, description: description || null, date: new Date(date), endDate: endDate ? new Date(endDate) : null, venue, category: category || "General", status: status || "PLANNING", creatorId: req.user!.id },
      include: { creator: { select: { name: true } } },
    });
    res.status(201).json({ success: true, data: event });
  } catch (e) { logger.error({ err: e }, "Events error"); res.status(500).json({ success: false, error: "Server error" }); }
});

// PUT /api/events/:id
router.put("/:id", authenticate, requireContentAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id as string },
      data: { ...(b.title && { title: b.title }), ...(b.description !== undefined && { description: b.description }), ...(b.date && { date: new Date(b.date) }), ...(b.venue && { venue: b.venue }), ...(b.category && { category: b.category }), ...(b.status && { status: b.status }), ...(b.rsvpCount !== undefined && { rsvpCount: b.rsvpCount }) },
      include: { creator: { select: { name: true } } },
    });
    res.json({ success: true, data: event });
  } catch (e) { logger.error({ err: e }, "Events error"); res.status(500).json({ success: false, error: "Server error" }); }
});

// DELETE /api/events/:id
router.delete("/:id", authenticate, requireContentAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.event.delete({ where: { id } });
    res.json({ success: true, message: "Deleted" });
  } catch (e) { logger.error({ err: e }, "Event delete error"); res.status(500).json({ success: false, error: "Server error" }); }
});

export default router;
