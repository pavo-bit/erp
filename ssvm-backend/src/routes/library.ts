import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, requireOperationsAdmin, requireLibraryAdmin } from "../middleware/auth";
import { requireModule } from "../middleware/moduleGuard";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { LibraryService } from "../services/library.service";

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
  subject: z.string().optional(),
  language: z.string().default("English"),
  description: z.string().optional(),
  edition: z.string().optional(),
  publicationYear: z.number().int().optional(),
  shelfLocation: z.string().optional(),
  coverImage: z.string().optional(),
  totalCopies: z.number().int().min(1).default(1),
  initialCopies: z.number().int().min(1).default(1),
});

const issueBookSchema = z.object({
  bookId: z.string(),
  copyId: z.string().optional(),
  userId: z.string(),
  userType: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
  dueDate: z.string().optional(),
  dueDateOverride: z.string().optional(),
  notes: z.string().optional(),
});

const returnBookSchema = z.object({
  condition: z.enum(["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE", "LOST"]).default("GOOD"),
  damageNotes: z.string().optional(),
  returnNotes: z.string().optional(),
  fineAmount: z.number().optional(),
  manualFineOverride: z.number().optional(),
});

const renewBookSchema = z.object({
  reason: z.string().optional(),
});

const policySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  targetGroup: z.string().default("STUDENT"),
  maxActiveBooks: z.number().int().min(1).default(3),
  maxDurationDays: z.number().int().min(1).default(14),
  durationUnit: z.string().default("CALENDAR_DAYS"),
  renewalAllowance: z.boolean().default(true),
  maxRenewalCount: z.number().int().min(0).default(2),
  renewalDurationDays: z.number().int().min(1).default(7),
  dailyFineRate: z.number().min(0).default(5),
  gracePeriodDays: z.number().int().min(0).default(2),
  countHolidays: z.boolean().default(false),
  blockOverdueBorrowing: z.boolean().default(true),
  blockFineBorrowing: z.boolean().default(true),
  allowReservations: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

// ═══════════════════════════════════════════
// Library Module Entitlement & Authentication
// ═══════════════════════════════════════════

router.use(authenticate, requireModule("LIBRARY"));

/**
 * ─────────────────────────────────────────────────────────────
 * 1. LIBRARY OVERVIEW & DASHBOARD METRICS
 * ─────────────────────────────────────────────────────────────
 */

router.get("/overview", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: "School context required" });
      return;
    }

    const stats = await LibraryService.getOverviewStats(schoolId);
    res.json({ success: true, data: stats });
  } catch (e: any) {
    logger.error({ err: e }, "Library overview error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 2. BOOK CATALOGUE MANAGEMENT
 * ─────────────────────────────────────────────────────────────
 */

// List Books
router.get("/books", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: "School context required" });
      return;
    }

    const { category, search, language, includeArchived } = req.query;
    const books = await LibraryService.listBooks(schoolId, {
      category: category as string,
      search: search as string,
      language: language as string,
      includeArchived: includeArchived === "true",
    });

    res.json({ success: true, data: books });
  } catch (e: any) {
    logger.error({ err: e }, "List books error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

// Get Single Book by ID
router.get("/books/:id", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const book = await LibraryService.getBookById(schoolId!, req.params.id as string);
    if (!book) {
      res.status(404).json({ success: false, error: "Book not found" });
      return;
    }
    res.json({ success: true, data: book });
  } catch (e: any) {
    logger.error({ err: e }, "Get book error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

// Add Book
router.post("/books", requireLibraryAdmin(), validate(bookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: "School context required" });
      return;
    }

    const book = await LibraryService.createBook(schoolId, req.body);
    res.status(201).json({ success: true, data: book });
  } catch (e: any) {
    logger.error({ err: e }, "Add book error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

// Update Book
router.put("/books/:id", requireLibraryAdmin(), validate(bookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const bookId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;

    const existing = await prisma.book.findFirst({ where: { id: bookId, schoolId } });
    if (!existing) {
      res.status(404).json({ success: false, error: "Book not found" });
      return;
    }

    const updated = await LibraryService.updateBook(schoolId!, bookId, req.body);
    res.json({ success: true, data: updated });
  } catch (e: any) {
    logger.error({ err: e }, "Update book error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

// Archive Book
router.post("/books/:id/archive", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const bookId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;

    const result = await LibraryService.archiveBook(schoolId!, bookId);
    res.json({ success: true, message: "Book archived successfully", data: result });
  } catch (e: any) {
    logger.error({ err: e }, "Archive book error");
    res.status(400).json({ success: false, error: e.message || "Failed to archive book" });
  }
});

// Delete Book
router.delete("/books/:id", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const bookId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;

    const existing = await prisma.book.findFirst({ where: { id: bookId, schoolId } });
    if (!existing) {
      res.status(404).json({ success: false, error: "Book not found" });
      return;
    }

    if (existing.available < existing.totalCopies) {
      res.status(400).json({ success: false, error: "Cannot delete book with active issued copies. Archive it instead." });
      return;
    }

    await prisma.book.delete({ where: { id: bookId } });
    res.json({ success: true, message: "Book deleted" });
  } catch (e: any) {
    logger.error({ err: e }, "Delete book error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 3. INDIVIDUAL PHYSICAL COPIES MANAGEMENT
 * ─────────────────────────────────────────────────────────────
 */

router.get("/copies", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const bookId = req.query.bookId as string;

    const copies = await LibraryService.listBookCopies(schoolId!, bookId);
    res.json({ success: true, data: copies });
  } catch (e: any) {
    logger.error({ err: e }, "List copies error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

router.post("/copies", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const { bookId, shelfLocation, condition, customAccession, price } = req.body;

    if (!bookId) {
      res.status(400).json({ success: false, error: "Book ID is required" });
      return;
    }

    const copy = await LibraryService.addBookCopy(schoolId!, bookId, {
      shelfLocation,
      condition,
      customAccession,
      price: price ? Number(price) : undefined,
    });

    res.status(201).json({ success: true, data: copy });
  } catch (e: any) {
    logger.error({ err: e }, "Add copy error");
    res.status(400).json({ success: false, error: e.message || "Failed to add physical copy" });
  }
});

router.put("/copies/:id/condition", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const copyId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const { condition, status, shelfLocation, notes } = req.body;

    const copy = await prisma.bookCopy.findFirst({ where: { id: copyId, schoolId } });
    if (!copy) {
      res.status(404).json({ success: false, error: "Copy not found" });
      return;
    }

    const updated = await prisma.bookCopy.update({
      where: { id: copyId },
      data: { condition, status, shelfLocation, notes },
    });

    res.json({ success: true, data: updated });
  } catch (e: any) {
    logger.error({ err: e }, "Update copy error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 4. MEMBERS DIRECTORY
 * ─────────────────────────────────────────────────────────────
 */

router.get("/members", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const search = req.query.search as string;

    const members = await LibraryService.getMembersDirectory(schoolId!, search);
    res.json({ success: true, data: members });
  } catch (e: any) {
    logger.error({ err: e }, "Members directory error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 5. BOOK ISSUE MANAGEMENT & ACTIVE ISSUE CARDS
 * ─────────────────────────────────────────────────────────────
 */

// Issue Book
router.post("/issues", requireLibraryAdmin(), validate(issueBookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const librarianId = req.user!.id;

    const issue = await LibraryService.issueBook(
      schoolId!,
      {
        bookId: req.body.bookId,
        copyId: req.body.copyId,
        userId: req.body.userId,
        userType: req.body.userType || "STUDENT",
        dueDateOverride: req.body.dueDateOverride || req.body.dueDate,
        notes: req.body.notes,
      },
      librarianId
    );

    res.status(201).json({ success: true, data: issue });
  } catch (e: any) {
    logger.error({ err: e }, "Issue book error");
    res.status(400).json({ success: false, error: e.message || "Failed to issue book" });
  }
});

// Legacy Alias for Frontend Compatibility: /api/v1/library/transactions/issue
router.post("/transactions/issue", requireLibraryAdmin(), validate(issueBookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const librarianId = req.user!.id;

    const issue = await LibraryService.issueBook(
      schoolId!,
      {
        bookId: req.body.bookId,
        copyId: req.body.copyId,
        userId: req.body.userId || req.body.studentId,
        userType: req.body.userType || "STUDENT",
        dueDateOverride: req.body.dueDateOverride || req.body.dueDate,
        notes: req.body.notes,
      },
      librarianId
    );

    res.status(201).json({ success: true, data: issue });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message || "Failed to issue book" });
  }
});

// List Issues
router.get("/issues", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const { status, userId } = req.query;

    const where: Prisma.BookIssueWhereInput = { schoolId: schoolId || undefined };
    if (status) where.status = status as string;
    if (userId) where.userId = userId as string;

    const issues = await prisma.bookIssue.findMany({
      where,
      include: {
        book: true,
        copy: true,
        renewals: true,
      },
      orderBy: { dueDate: "asc" },
    });

    res.json({ success: true, data: issues });
  } catch (e: any) {
    logger.error({ err: e }, "List issues error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

// Legacy Alias for Frontend Compatibility: /api/v1/library/transactions
router.get("/transactions", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const { status, userId } = req.query;

    const where: Prisma.BookIssueWhereInput = { schoolId: schoolId || undefined };
    if (status) where.status = status as string;
    if (userId) where.userId = userId as string;

    const issues = await prisma.bookIssue.findMany({
      where,
      include: {
        book: true,
        copy: true,
      },
      orderBy: { issueDate: "desc" },
    });

    // Populate student information for frontend data table
    const studentIds = issues.filter((i) => i.userType === "STUDENT").map((i) => i.userId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, admissionNo: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const formatted = issues.map((i) => ({
      ...i,
      student: studentMap.get(i.userId) || { name: i.userId },
      issuedAt: i.issueDate,
      returnedAt: i.returnDate,
    }));

    res.json({ success: true, data: formatted });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

// Active Issue Cards
router.get("/active-cards", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const cards = await LibraryService.listActiveCards(schoolId!);

    // Map student names
    const studentIds = cards.filter((c) => c.userType === "STUDENT").map((c) => c.userId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { sectionRef: { include: { class: true } } },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const now = new Date();
    const enriched = cards.map((c) => {
      const student = studentMap.get(c.userId);
      const isOverdue = now > c.dueDate && c.status !== "RETURNED";
      const daysOverdue = isOverdue ? Math.ceil((now.getTime() - c.dueDate.getTime()) / (1000 * 3600 * 24)) : 0;

      return {
        ...c,
        studentName: student?.name || c.userId,
        admissionNo: student?.admissionNo || "—",
        classSection: student?.sectionRef ? `${student.sectionRef.class.name} - ${student.sectionRef.name}` : "—",
        isOverdue,
        daysOverdue,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (e: any) {
    logger.error({ err: e }, "Active cards error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 6. BOOK RETURN WORKFLOW
 * ─────────────────────────────────────────────────────────────
 */

router.post("/issues/:id/return", requireLibraryAdmin(), validate(returnBookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const issueId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const librarianId = req.user!.id;

    const result = await LibraryService.returnBook(
      schoolId!,
      issueId,
      {
        condition: req.body.condition || "GOOD",
        damageNotes: req.body.damageNotes,
        returnNotes: req.body.returnNotes,
        manualFineOverride: req.body.manualFineOverride || req.body.fineAmount,
      },
      librarianId
    );

    res.json({ success: true, data: result });
  } catch (e: any) {
    logger.error({ err: e }, "Return book error");
    res.status(400).json({ success: false, error: e.message || "Failed to return book" });
  }
});

// Legacy Alias for Frontend Compatibility: /api/v1/library/transactions/:id/return
router.put("/transactions/:id/return", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const issueId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const librarianId = req.user!.id;

    const result = await LibraryService.returnBook(
      schoolId!,
      issueId,
      {
        condition: req.body.condition || "GOOD",
        damageNotes: req.body.damageNotes,
        returnNotes: req.body.returnNotes,
        manualFineOverride: req.body.fineAmount,
      },
      librarianId
    );

    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message || "Failed to return book" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 7. RENEWALS & EXTENSIONS
 * ─────────────────────────────────────────────────────────────
 */

router.post("/issues/:id/renew", requireLibraryAdmin(), validate(renewBookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const issueId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const librarianId = req.user!.id;
    const reason = req.body.reason || "Standard renewal request";

    const result = await LibraryService.renewBook(schoolId!, issueId, reason, librarianId);
    res.json({ success: true, data: result });
  } catch (e: any) {
    logger.error({ err: e }, "Renew book error");
    res.status(400).json({ success: false, error: e.message || "Failed to renew book" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 8. PERMANENT STUDENT BORROWING HISTORY & LIBRARY PROFILE
 * ─────────────────────────────────────────────────────────────
 */

// Student Library Profile with derived metrics & full history
router.get("/students/:id/profile", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const studentId = req.params.id as string;

    const profile = await LibraryService.getStudentLibraryProfile(schoolId!, studentId);
    res.json({ success: true, data: profile });
  } catch (e: any) {
    logger.error({ err: e }, "Student library profile error");
    res.status(404).json({ success: false, error: e.message || "Student profile not found" });
  }
});

// Student Borrowing History list
router.get("/students/:id/history", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const studentId = req.params.id as string;

    const history = await LibraryService.getStudentBorrowingHistory(schoolId!, studentId);
    res.json({ success: true, data: history });
  } catch (e: any) {
    logger.error({ err: e }, "Student borrowing history error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

// Student Portal Self-Service: My Library Books & History
router.get("/my-books", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    let studentId = req.user!.id;

    // Resolve Student ID if user logged in via auth user record
    if (req.user!.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { schoolId, OR: [{ userId: req.user!.id }, { id: req.user!.id }] },
      });
      if (student) studentId = student.id;
    }

    const profile = await LibraryService.getStudentLibraryProfile(schoolId, studentId);
    res.json({
      success: true,
      data: profile.activeIssues,
      profile,
    });
  } catch (e: any) {
    logger.error({ err: e }, "My books error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 9. STUDENT BOOK REQUESTS / RESERVATIONS
 * ─────────────────────────────────────────────────────────────
 */

router.get("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const studentId = req.query.studentId as string;

    const requests = await LibraryService.listStudentRequests(schoolId!, studentId);
    res.json({ success: true, data: requests });
  } catch (e: any) {
    logger.error({ err: e }, "List requests error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

router.post("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { bookId } = req.body;
    let studentId = req.body.studentId || req.user!.id;

    if (req.user!.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { schoolId, OR: [{ userId: req.user!.id }, { id: req.user!.id }] },
      });
      if (student) studentId = student.id;
    }

    if (!bookId) {
      res.status(400).json({ success: false, error: "Book ID is required" });
      return;
    }

    const request = await LibraryService.createStudentRequest(schoolId, studentId, bookId);
    res.status(201).json({ success: true, data: request });
  } catch (e: any) {
    logger.error({ err: e }, "Create request error");
    res.status(400).json({ success: false, error: e.message || "Failed to create book request" });
  }
});

router.put("/requests/:id/review", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const requestId = req.params.id as string;
    const { status, notes } = req.body;
    const librarianId = req.user!.id;

    const updated = await LibraryService.reviewStudentRequest(schoolId, requestId, status, notes || "", librarianId);
    res.json({ success: true, data: updated });
  } catch (e: any) {
    logger.error({ err: e }, "Review request error");
    res.status(400).json({ success: false, error: e.message || "Failed to review request" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 10. OVERDUE MANAGEMENT & FINES
 * ─────────────────────────────────────────────────────────────
 */

router.get("/overdue", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;

    const overdueIssues = await prisma.bookIssue.findMany({
      where: {
        schoolId: schoolId || undefined,
        status: { in: ["ISSUED", "OVERDUE"] },
        dueDate: { lt: new Date() },
      },
      include: {
        book: true,
        copy: true,
      },
      orderBy: { dueDate: "asc" },
    });

    const studentIds = overdueIssues.filter((i) => i.userType === "STUDENT").map((i) => i.userId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { sectionRef: { include: { class: true } } },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const now = new Date();
    const enriched = overdueIssues.map((i) => {
      const student = studentMap.get(i.userId);
      const daysOverdue = Math.ceil((now.getTime() - i.dueDate.getTime()) / (1000 * 3600 * 24));
      return {
        ...i,
        studentName: student?.name || i.userId,
        admissionNo: student?.admissionNo || "—",
        classSection: student?.sectionRef ? `${student.sectionRef.class.name} - ${student.sectionRef.name}` : "—",
        daysOverdue,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (e: any) {
    logger.error({ err: e }, "List overdue error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

// Calculate Fines (Phase 4 backwards compatibility)
router.post("/fines/calculate", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { dailyFineRate = 10 } = req.body;

    const overdueIssues = await prisma.bookIssue.findMany({
      where: {
        schoolId,
        status: { in: ["ISSUED", "OVERDUE"] },
        dueDate: { lt: new Date() },
      },
    });

    let updatedCount = 0;
    const now = new Date();

    for (const issue of overdueIssues) {
      const daysOverdue = Math.floor((now.getTime() - issue.dueDate.getTime()) / (1000 * 3600 * 24));
      if (daysOverdue > 0) {
        const calculatedFine = daysOverdue * dailyFineRate;

        await prisma.bookIssue.update({
          where: { id: issue.id },
          data: {
            status: "OVERDUE",
            fineAmount: calculatedFine,
          },
        });

        // Sync to Student Fee Invoice (Phase 4 integration)
        if (issue.userType === "STUDENT" && calculatedFine > 0) {
          const existingInvoice = await prisma.invoice.findFirst({
            where: {
              schoolId,
              studentId: issue.userId,
              description: `Library Fine for Book Issue ID: ${issue.id}`,
              status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
            },
          });

          if (existingInvoice) {
            const fineDecimal = new Prisma.Decimal(calculatedFine);
            await prisma.invoice.update({
              where: { id: existingInvoice.id },
              data: {
                amount: fineDecimal,
                remainingAmount: fineDecimal.sub(existingInvoice.amountPaid),
                status: "OVERDUE",
                isOverdue: true,
              },
            });
          } else {
            const fineDecimal = new Prisma.Decimal(calculatedFine);
            await prisma.invoice.create({
              data: {
                schoolId,
                studentId: issue.userId,
                amount: fineDecimal,
                amountPaid: new Prisma.Decimal(0),
                remainingAmount: fineDecimal,
                fineAmount: new Prisma.Decimal(0),
                type: "MISCELLANEOUS",
                status: "OVERDUE",
                isOverdue: true,
                dueDate: now,
                description: `Library Fine for Book Issue ID: ${issue.id}`,
              },
            });
          }
        }

        updatedCount++;
      }
    }

    logger.info({ schoolId, updatedCount }, "Overdue fines calculated");
    res.json({ success: true, message: `Calculated fines for ${updatedCount} overdue issues.` });
  } catch (e) {
    logger.error({ err: e }, "Calculate fines error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Waive Fine
router.put("/issues/:id/waive-fine", requireLibraryAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const issueId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const { reason } = req.body;

    if (!reason || reason.length < 5) {
      res.status(400).json({ success: false, error: "A valid reason (min 5 chars) is required to waive a fine" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const issue = await tx.bookIssue.findUnique({ where: { id: issueId } });
      if (!issue || issue.schoolId !== schoolId) {
        throw new Error("Issue record not found");
      }
      if (!issue.fineAmount || issue.fineAmount <= 0) {
        throw new Error("No fine to waive for this issue");
      }

      const updated = await tx.bookIssue.update({
        where: { id: issueId },
        data: {
          fineAmount: 0,
          fineWaived: true,
          fineWaiveReason: reason,
        },
      });

      if (issue.userType === "STUDENT") {
        const invoices = await tx.invoice.findMany({
          where: {
            schoolId,
            studentId: issue.userId,
            description: `Library Fine for Book Issue ID: ${issue.id}`,
            status: "PENDING",
          },
        });

        for (const inv of invoices) {
          await tx.invoice.update({
            where: { id: inv.id },
            data: { status: "PAID", remainingAmount: 0 },
          });
        }
      }

      await tx.libraryAuditEvent.create({
        data: {
          schoolId,
          action: "WAIVE_FINE",
          entityType: "BookIssue",
          entityId: issueId,
          performedBy: req.user!.id,
          actorRole: req.user!.role,
          details: { previousFine: issue.fineAmount, reason },
        },
      });

      return updated;
    });

    res.json({ success: true, data: result });
  } catch (e: any) {
    logger.error({ err: e }, "Waive fine error");
    res.status(400).json({ success: false, error: e.message || "Failed to waive fine" });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * 11. BORROWING POLICIES & SETTINGS
 * ─────────────────────────────────────────────────────────────
 */

router.get("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) || req.user!.schoolId : req.user!.schoolId;
    const policies = await LibraryService.getBorrowingPolicies(schoolId!);
    res.json({ success: true, data: policies });
  } catch (e: any) {
    logger.error({ err: e }, "Get policies error");
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

router.post("/policies", requireLibraryAdmin(), validate(policySchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId || req.user!.schoolId : req.user!.schoolId;
    const policy = await LibraryService.upsertBorrowingPolicy(schoolId!, req.body);
    res.json({ success: true, data: policy });
  } catch (e: any) {
    logger.error({ err: e }, "Save policy error");
    res.status(400).json({ success: false, error: e.message || "Failed to save policy" });
  }
});

export default router;
