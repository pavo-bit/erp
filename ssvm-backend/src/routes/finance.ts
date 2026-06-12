import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import logger from "../lib/logger";

const router = Router();

// GET /api/finance/defaulters
router.get("/defaulters", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: "School ID missing" }); return; }

    const now = new Date();
    
    // Find all invoices that are overdue or pending but past due date
    const defaulters = await prisma.invoice.findMany({
      where: {
        schoolId,
        status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
        dueDate: { lt: now },
      },
      include: {
        student: {
          select: { name: true,   guardian: true }
        }
      },
      orderBy: { dueDate: "asc" }
    });

    // We can also compute dynamically applied fines if we want, but for now we just return the raw data
    const enhancedDefaulters = defaulters.map(inv => {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24));
      return {
        ...inv,
        daysOverdue,
        remainingAmount: inv.amount + inv.fineAmount - inv.amountPaid
      };
    });

    res.json({ success: true, data: enhancedDefaulters });
  } catch (e) { 
    logger.error({ err: e }, "Get defaulters error");
    res.status(500).json({ success: false, error: "Server error" }); 
  }
});

// POST /api/finance/generate-monthly-fees
router.post("/generate-monthly-fees", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: "School ID missing" }); return; }

    // Logic: Fetch all active students, fetch fee structures for their class/section, create invoices
    const activeStudents = await prisma.student.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, sectionRef: { select: { classId: true } } }
    });

    const feeStructures = await prisma.feeStructure.findMany({
      where: { schoolId },
      include: { category: true }
    });

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const dueDate = new Date(currentYear, currentMonth, 10); // Due 10th of the month

    let count = 0;

    for (const student of activeStudents) {
      // Find matching structure for student's class (and section if applicable)
      const matches = feeStructures.filter(fs => 
        fs.classId === student.sectionRef?.classId &&
        fs.category.name === "Monthly"
      );

      for (const structure of matches) {
        // Prevent duplicate generation for same month/category
        const existing = await prisma.invoice.findFirst({
          where: {
            studentId: student.id,
            type: "MONTHLY",
            dueDate: {
              gte: new Date(currentYear, currentMonth, 1),
              lt: new Date(currentYear, currentMonth + 1, 1)
            }
          }
        });

        if (!existing) {
          await prisma.invoice.create({
            data: {
              studentId: student.id,
              schoolId: schoolId,
              amount: structure.amount,
              type: "MONTHLY",
              status: "PENDING",
              dueDate,
              // session: student?.session,
              description: `Monthly Fee - ${new Date().toLocaleString('default', { month: 'long' })} ${currentYear}`
            }
          });
          count++;
        }
      }
    }

    logger.info({ generatedCount: count, schoolId }, "Monthly fees generated");
    res.status(201).json({ success: true, message: `Successfully generated ${count} monthly invoices.` });
  } catch (e) { 
    logger.error({ err: e }, "Generate monthly fees error");
    res.status(500).json({ success: false, error: "Server error" }); 
  }
});

export default router;
