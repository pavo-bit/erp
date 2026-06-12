import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Testimonials
router.get("/testimonials", async (_req, res: Response) => {
  try {
    const data = await prisma.testimonial.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" } });
    res.json({ success: true, data });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

router.post("/testimonials", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, role, content, rating } = req.body;
    if (!name || !role || !content) { res.status(400).json({ success: false, error: "Required fields missing" }); return; }
    const t = await prisma.testimonial.create({ data: { name, role, content, rating: rating || 5 } });
    res.status(201).json({ success: true, data: t });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// Site Content CMS
router.get("/site-content", async (req, res: Response) => {
  try {
    const { section } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (section) where.section = section;
    const content = await prisma.siteContent.findMany({ where });
    const mapped: Record<string, Record<string, string>> = {};
    content.forEach(c => { if (!mapped[c.section]) mapped[c.section] = {}; mapped[c.section][c.key] = c.value; });
    res.json({ success: true, data: mapped });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

router.put("/site-content", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { updates } = req.body;
    if (!updates?.length) { res.status(400).json({ success: false, error: "Updates array required" }); return; }
    const results = [];
    for (const u of updates) {
      const existing = await prisma.siteContent.findFirst({ where: { section: u.section || u.page, key: u.key } });
      if (existing) {
        results.push(await prisma.siteContent.update({ where: { id: existing.id }, data: { value: u.value } }));
      } else {
        results.push(await prisma.siteContent.create({ data: { section: u.section || u.page, key: u.key, value: u.value, type: u.type || "text" } }));
      }
    }
    res.json({ success: true, data: results });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// Analytics
router.get("/analytics", authenticate, requireRole("ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    const [totalStudents, totalParents, totalAlumni, totalFaculty, activeNotices, upcomingEvents, feesPaid, feesPending, recentAdmissions] = await Promise.all([
      prisma.student.count(), prisma.guardian.count(), prisma.alumni.count(),
      prisma.teacher.count({ where: { isActive: true } }), prisma.notice.count({ where: { status: "PUBLISHED" } }),
      prisma.event.count({ where: { status: "UPCOMING" } }),
      prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { status: { in: ["PENDING", "OVERDUE"] } }, _sum: { amount: true } }),
      prisma.student.count({ where: { createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalAtt = await prisma.attendance.count({ where: { date: { gte: monthStart } } });
    const presentAtt = await prisma.attendance.count({ where: { date: { gte: monthStart }, status: "PRESENT" } });
    const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

    const monthlyFees = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const sum = await prisma.invoice.aggregate({ where: { status: "PAID", paidDate: { gte: start, lt: end } }, _sum: { amount: true } });
      monthlyFees.push({ month: start.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }), amount: sum._sum.amount || 0 });
    }

    res.json({ success: true, data: {
      overview: { totalStudents, totalParents, totalAlumni, totalFaculty, activeNotices, upcomingEvents, recentAdmissions, attendanceRate },
      finance: { totalCollected: feesPaid._sum.amount || 0, totalPending: feesPending._sum.amount || 0, monthlyFees },
    }});
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

export default router;
