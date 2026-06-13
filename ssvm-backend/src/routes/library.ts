import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAdmin, requireRole } from "../middleware/auth";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

// ═══════════════════════════════════════════
// Schemas
// ═══════════════════════════════════════════

const bookSchema = z.object({
  title: z.string().min(2),
  author: z.string().min(2),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  category: z.string().default("General"),
  totalCopies: z.number().int().min(1).default(1),
  shelfLocation: z.string().optional(),
});

const issueBookSchema = z.object({
  bookId: z.string(),
  userId: z.string(),
  userType: z.enum(["STUDENT", "TEACHER"]),
  dueDate: z.string().datetime(),
});

// ═══════════════════════════════════════════
// Book Management
// ═══════════════════════════════════════════

// List Books
router.get("/books", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.query.schoolId as string : req.user!.schoolId;
    const { category, search } = req.query;

    const where: any = { schoolId };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { author: { contains: search as string, mode: "insensitive" } },
        { isbn: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const books = await prisma.book.findMany({
      where,
      orderBy: { title: "asc" },
    });

    res.json({ success: true, data: books });
  } catch (e) {
    logger.error({ err: e }, "List books error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Add Book
router.post("/books", authenticate, requireRole("LIBRARIAN", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), validate(bookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const bookData = req.body;

    const book = await prisma.book.create({
      data: {
        ...bookData,
        schoolId,
        available: bookData.totalCopies,
      },
    });

    logger.info({ bookId: book.id }, "Book added");
    res.status(201).json({ success: true, data: book });
  } catch (e) {
    logger.error({ err: e }, "Add book error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Update Book
router.put("/books/:id", authenticate, requireRole("LIBRARIAN", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), validate(bookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const bookId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const bookData = req.body;

    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing || existing.schoolId !== schoolId) {
      res.status(404).json({ success: false, error: "Book not found" }); return;
    }

    // Adjust available copies if total changes
    const diff = bookData.totalCopies - existing.totalCopies;
    const newAvailable = Math.max(0, existing.available + diff);

    const book = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...bookData,
        available: newAvailable,
      },
    });

    res.json({ success: true, data: book });
  } catch (e) {
    logger.error({ err: e }, "Update book error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Delete Book
router.delete("/books/:id", authenticate, requireRole("LIBRARIAN", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const bookId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;

    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing || existing.schoolId !== schoolId) {
      res.status(404).json({ success: false, error: "Book not found" }); return;
    }

    if (existing.available < existing.totalCopies) {
      res.status(400).json({ success: false, error: "Cannot delete book with active issues" }); return;
    }

    await prisma.book.delete({ where: { id: bookId } });
    logger.info({ bookId }, "Book deleted");
    res.json({ success: true, message: "Book deleted" });
  } catch (e) {
    logger.error({ err: e }, "Delete book error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// Issue Management
// ═══════════════════════════════════════════

// Issue Book
router.post("/issues", authenticate, requireRole("LIBRARIAN", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), validate(issueBookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { bookId, userId, userType, dueDate } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book || book.schoolId !== schoolId) {
        throw new Error("Book not found");
      }
      if (book.available <= 0) {
        throw new Error("No copies available");
      }

      const issue = await tx.bookIssue.create({
        data: {
          bookId,
          schoolId,
          userId,
          userType,
          dueDate: new Date(dueDate),
        },
      });

      await tx.book.update({
        where: { id: bookId },
        data: { available: { decrement: 1 } },
      });

      return issue;
    });

    logger.info({ issueId: result.id, bookId }, "Book issued");
    res.status(201).json({ success: true, data: result });
  } catch (e: any) {
    logger.error({ err: e }, "Issue book error");
    res.status(400).json({ success: false, error: e.message || "Failed to issue book" });
  }
});

// Return Book
router.post("/issues/:id/return", authenticate, requireRole("LIBRARIAN", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const issueId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { fineAmount } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const issue = await tx.bookIssue.findUnique({ where: { id: issueId } });
      if (!issue || issue.schoolId !== schoolId) {
        throw new Error("Issue record not found");
      }
      if (issue.status !== "ISSUED" && issue.status !== "OVERDUE") {
        throw new Error(`Book is already marked as ${issue.status}`);
      }

      const updated = await tx.bookIssue.update({
        where: { id: issueId },
        data: {
          status: "RETURNED",
          returnDate: new Date(),
          fineAmount: fineAmount || 0,
        },
      });

      await tx.book.update({
        where: { id: issue.bookId },
        data: { available: { increment: 1 } },
      });

      if (fineAmount && fineAmount > 0 && issue.userType === "STUDENT") {
        await tx.invoice.create({
          data: {
            schoolId,
            studentId: issue.userId,
            amount: fineAmount,
            type: "MISCELLANEOUS",
            status: "PENDING",
            dueDate: new Date(),
            description: `Library Fine for Book Issue ID: ${issue.id}`,
          }
        });
      }

      return updated;
    });

    logger.info({ issueId }, "Book returned");
    res.json({ success: true, data: result });
  } catch (e: any) {
    logger.error({ err: e }, "Return book error");
    res.status(400).json({ success: false, error: e.message || "Failed to return book" });
  }
});

// List Active Issues
router.get("/issues", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.query.schoolId as string : req.user!.schoolId;
    const { status, userId } = req.query;

    const where: any = { schoolId };
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const issues = await prisma.bookIssue.findMany({
      where,
      include: { book: true },
      orderBy: { dueDate: "asc" },
    });

    res.json({ success: true, data: issues });
  } catch (e) {
    logger.error({ err: e }, "List issues error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// List Overdue Issues
router.get("/overdue", authenticate, requireRole("LIBRARIAN", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.query.schoolId as string : req.user!.schoolId;

    const overdueIssues = await prisma.bookIssue.findMany({
      where: {
        schoolId: schoolId || undefined,
        status: { in: ["ISSUED", "OVERDUE"] },
        dueDate: { lt: new Date() }
      },
      include: { book: true },
      orderBy: { dueDate: "asc" },
    });

    res.json({ success: true, data: overdueIssues });
  } catch (e) {
    logger.error({ err: e }, "List overdue issues error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
