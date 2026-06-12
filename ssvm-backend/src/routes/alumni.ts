import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Alumni listing
router.get("/", async (req, res: Response) => {
  try {
    const { featured, batch, search } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (featured === "true") where.isFeatured = true;
    if (batch) where.batch = batch;
    if (search) where.user = { name: { contains: search } };
    const alumni = await prisma.alumni.findMany({ where, include: { user: { select: { id: true, name: true, email: true, avatar: true } }, contributions: { orderBy: { date: "desc" }, take: 5 } }, orderBy: { batch: "desc" } });
    res.json({ success: true, data: alumni });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// Admin updates alumni
router.put("/", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id, isFeatured, currentRole, company, achievement } = req.body;
    if (!id) { res.status(400).json({ success: false, error: "ID required" }); return; }
    const a = await prisma.alumni.update({ where: { id }, data: { ...(isFeatured !== undefined && { isFeatured }), ...(currentRole && { currentRole }), ...(company && { company }), ...(achievement && { achievement }) }, include: { user: { select: { name: true } } } });
    res.json({ success: true, data: a });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// Contributions
router.get("/contributions", async (req, res: Response) => {
  try {
    const { alumniId } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (alumniId) where.alumniId = alumniId;
    const data = await prisma.contribution.findMany({ where, include: { alumni: { include: { user: { select: { name: true } } } } }, orderBy: { date: "desc" } });
    res.json({ success: true, data });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

router.post("/contributions", authenticate, requireRole("ADMIN", "ALUMNI"), async (req: AuthRequest, res: Response) => {
  try {
    const { alumniId, amount, purpose, date } = req.body;
    if (!alumniId || !amount || !purpose) { res.status(400).json({ success: false, error: "Required fields missing" }); return; }
    const c = await prisma.contribution.create({ data: { alumniId, amount: parseFloat(amount), purpose, date: date ? new Date(date) : new Date() }, include: { alumni: { include: { user: { select: { name: true } } } } } });
    res.status(201).json({ success: true, data: c });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

export default router;
