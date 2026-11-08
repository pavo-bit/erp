/**
 * ssvm-backend/src/services/library.service.ts
 * Enterprise Library Management System Service
 * Physical copy circulation, configurable borrowing policies, atomic issue/return workflows,
 * fine accounting, and permanent student borrowing history.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

export interface BookCatalogueInput {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  category?: string;
  subject?: string;
  language?: string;
  description?: string;
  edition?: string;
  publicationYear?: number;
  coverImage?: string;
  shelfLocation?: string;
  initialCopies?: number;
}

export interface IssueBookInput {
  bookId: string;
  copyId?: string;
  userId: string;
  userType: "STUDENT" | "TEACHER";
  dueDateOverride?: string;
  notes?: string;
}

export interface ReturnBookInput {
  condition: "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE" | "LOST";
  damageNotes?: string;
  returnNotes?: string;
  manualFineOverride?: number;
}

export class LibraryService {
  /**
   * ─────────────────────────────────────────────────────────────
   * 1. BORROWING POLICIES
   * ─────────────────────────────────────────────────────────────
   */

  static async getBorrowingPolicies(schoolId: string) {
    let policies = await prisma.borrowingPolicy.findMany({
      where: { schoolId },
      orderBy: { createdAt: "asc" },
    });

    // Seed default baseline policies if none configured
    if (policies.length === 0) {
      const defaultPolicies = [
        {
          name: "Standard Student Policy",
          targetGroup: "STUDENT",
          maxActiveBooks: 3,
          maxDurationDays: 14,
          durationUnit: "CALENDAR_DAYS",
          renewalAllowance: true,
          maxRenewalCount: 2,
          renewalDurationDays: 7,
          dailyFineRate: new Prisma.Decimal(5.0),
          gracePeriodDays: 2,
          countHolidays: false,
          blockOverdueBorrowing: true,
          blockFineBorrowing: true,
          allowReservations: true,
          isDefault: true,
        },
        {
          name: "Primary Wing Policy (Classes 1-5)",
          targetGroup: "STUDENT_PRIMARY",
          maxActiveBooks: 2,
          maxDurationDays: 7,
          durationUnit: "CALENDAR_DAYS",
          renewalAllowance: true,
          maxRenewalCount: 1,
          renewalDurationDays: 5,
          dailyFineRate: new Prisma.Decimal(2.0),
          gracePeriodDays: 3,
          countHolidays: false,
          blockOverdueBorrowing: true,
          blockFineBorrowing: false,
          allowReservations: true,
          isDefault: false,
        },
        {
          name: "Faculty & Staff Borrowing Policy",
          targetGroup: "TEACHER",
          maxActiveBooks: 10,
          maxDurationDays: 30,
          durationUnit: "CALENDAR_DAYS",
          renewalAllowance: true,
          maxRenewalCount: 3,
          renewalDurationDays: 15,
          dailyFineRate: new Prisma.Decimal(0.0),
          gracePeriodDays: 5,
          countHolidays: false,
          blockOverdueBorrowing: false,
          blockFineBorrowing: false,
          allowReservations: true,
          isDefault: false,
        },
      ];

      for (const p of defaultPolicies) {
        await prisma.borrowingPolicy.create({
          data: { ...p, schoolId },
        });
      }

      policies = await prisma.borrowingPolicy.findMany({
        where: { schoolId },
        orderBy: { createdAt: "asc" },
      });
    }

    return policies;
  }

  static async upsertBorrowingPolicy(schoolId: string, data: any) {
    if (data.id) {
      return prisma.borrowingPolicy.update({
        where: { id: data.id },
        data: {
          ...data,
          dailyFineRate: data.dailyFineRate ? new Prisma.Decimal(data.dailyFineRate) : undefined,
        },
      });
    }
    return prisma.borrowingPolicy.create({
      data: {
        ...data,
        schoolId,
        dailyFineRate: new Prisma.Decimal(data.dailyFineRate || 5.0),
      },
    });
  }

  static async resolvePolicyForMember(schoolId: string, userType: string) {
    const policies = await this.getBorrowingPolicies(schoolId);
    if (userType === "TEACHER") {
      const teacherPolicy = policies.find((p) => p.targetGroup === "TEACHER");
      if (teacherPolicy) return teacherPolicy;
    }
    const studentPolicy = policies.find((p) => p.targetGroup === "STUDENT" || p.isDefault);
    return studentPolicy || policies[0];
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 2. BOOK CATALOGUE & PHYSICAL COPIES
   * ─────────────────────────────────────────────────────────────
   */

  static async listBooks(schoolId: string, filters: { search?: string; category?: string; language?: string; includeArchived?: boolean }) {
    const where: Prisma.BookWhereInput = { schoolId };
    if (!filters.includeArchived) where.isArchived = false;
    if (filters.category && filters.category !== "ALL") where.category = filters.category;
    if (filters.language && filters.language !== "ALL") where.language = filters.language;

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { author: { contains: q, mode: "insensitive" } },
        { isbn: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { publisher: { contains: q, mode: "insensitive" } },
      ];
    }

    const books = await prisma.book.findMany({
      where,
      include: {
        copies: {
          select: {
            id: true,
            copyNumber: true,
            accessionNumber: true,
            barcode: true,
            shelfLocation: true,
            condition: true,
            status: true,
          },
        },
        _count: {
          select: {
            issues: { where: { status: { in: ["ISSUED", "OVERDUE"] } } },
            requests: { where: { status: "SUBMITTED" } },
          },
        },
      },
      orderBy: { title: "asc" },
    });

    return books.map((b) => {
      const activeCopies = b.copies.filter((c) => c.status !== "WITHDRAWN");
      const availableCopies = b.copies.filter((c) => c.status === "AVAILABLE").length;
      const issuedCopies = b.copies.filter((c) => c.status === "ISSUED").length;
      const damagedCopies = b.copies.filter((c) => c.status === "DAMAGED" || c.status === "UNDER_REPAIR").length;
      const lostCopies = b.copies.filter((c) => c.status === "LOST").length;

      return {
        ...b,
        totalPhysicalCopies: activeCopies.length || b.totalCopies,
        availableCopies: b.copies.length > 0 ? availableCopies : b.available,
        issuedCopies,
        damagedCopies,
        lostCopies,
        activeIssuesCount: b._count.issues,
        pendingRequestsCount: b._count.requests,
      };
    });
  }

  static async getBookById(schoolId: string, bookId: string) {
    const book = await prisma.book.findFirst({
      where: { id: bookId, schoolId },
      include: {
        copies: {
          orderBy: { copyNumber: "asc" },
        },
        requests: {
          where: { status: "SUBMITTED" },
          include: { student: { select: { id: true, name: true, admissionNo: true } } },
          orderBy: { requestedAt: "desc" },
        },
      },
    });
    return book;
  }

  static async createBook(schoolId: string, input: BookCatalogueInput) {
    const initialCopiesCount = Math.max(1, input.initialCopies || 1);

    return prisma.$transaction(async (tx) => {
      const book = await tx.book.create({
        data: {
          schoolId,
          title: input.title,
          author: input.author,
          isbn: input.isbn,
          publisher: input.publisher,
          category: input.category || "General",
          subject: input.subject,
          language: input.language || "English",
          description: input.description,
          edition: input.edition,
          publicationYear: input.publicationYear,
          coverImage: input.coverImage,
          shelfLocation: input.shelfLocation,
          totalCopies: initialCopiesCount,
          available: initialCopiesCount,
        },
      });

      // Generate physical book copies
      const cleanPrefix = input.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "BOOK";
      for (let i = 1; i <= initialCopiesCount; i++) {
        const accession = `ACC-${cleanPrefix}-${book.id.slice(-4).toUpperCase()}-${String(i).padStart(3, "0")}`;
        await tx.bookCopy.create({
          data: {
            schoolId,
            bookId: book.id,
            copyNumber: i,
            accessionNumber: accession,
            barcode: accession,
            shelfLocation: input.shelfLocation,
            condition: "GOOD",
            status: "AVAILABLE",
          },
        });
      }

      await tx.libraryAuditEvent.create({
        data: {
          schoolId,
          action: "CREATE_BOOK",
          entityType: "Book",
          entityId: book.id,
          performedBy: "LIBRARIAN",
          details: { title: book.title, initialCopies: initialCopiesCount },
        },
      });

      return book;
    });
  }

  static async updateBook(schoolId: string, bookId: string, input: Partial<BookCatalogueInput>) {
    return prisma.book.update({
      where: { id: bookId },
      data: {
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        publisher: input.publisher,
        category: input.category,
        subject: input.subject,
        language: input.language,
        description: input.description,
        edition: input.edition,
        publicationYear: input.publicationYear,
        coverImage: input.coverImage,
        shelfLocation: input.shelfLocation,
      },
    });
  }

  static async archiveBook(schoolId: string, bookId: string) {
    const activeIssues = await prisma.bookIssue.count({
      where: { bookId, schoolId, status: { in: ["ISSUED", "OVERDUE"] } },
    });
    if (activeIssues > 0) {
      throw new Error(`Cannot archive book: ${activeIssues} physical copy/copies are currently issued.`);
    }

    return prisma.book.update({
      where: { id: bookId },
      data: { isArchived: true },
    });
  }

  static async addBookCopy(schoolId: string, bookId: string, copyData: { shelfLocation?: string; condition?: string; customAccession?: string; price?: number }) {
    return prisma.$transaction(async (tx) => {
      const book = await tx.book.findFirst({ where: { id: bookId, schoolId } });
      if (!book) throw new Error("Book not found");

      const highestCopy = await tx.bookCopy.findFirst({
        where: { bookId },
        orderBy: { copyNumber: "desc" },
      });
      const newCopyNumber = (highestCopy?.copyNumber || 0) + 1;
      const cleanPrefix = book.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "BOOK";
      const accession = copyData.customAccession || `ACC-${cleanPrefix}-${book.id.slice(-4).toUpperCase()}-${String(newCopyNumber).padStart(3, "0")}`;

      const copy = await tx.bookCopy.create({
        data: {
          schoolId,
          bookId,
          copyNumber: newCopyNumber,
          accessionNumber: accession,
          barcode: accession,
          shelfLocation: copyData.shelfLocation || book.shelfLocation,
          condition: copyData.condition || "GOOD",
          status: "AVAILABLE",
          price: copyData.price ? new Prisma.Decimal(copyData.price) : undefined,
        },
      });

      await tx.book.update({
        where: { id: bookId },
        data: {
          totalCopies: { increment: 1 },
          available: { increment: 1 },
        },
      });

      return copy;
    });
  }

  static async listBookCopies(schoolId: string, bookId?: string) {
    return prisma.bookCopy.findMany({
      where: {
        schoolId,
        bookId: bookId || undefined,
      },
      include: {
        book: { select: { id: true, title: true, author: true, category: true } },
        issues: {
          where: { status: { in: ["ISSUED", "OVERDUE"] } },
          select: { id: true, userId: true, userType: true, dueDate: true, issueDate: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 3. BOOK ISSUANCE WORKFLOW
   * ─────────────────────────────────────────────────────────────
   */

  static async issueBook(schoolId: string, input: IssueBookInput, librarianId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Validate Member
      let memberName = "";
      let memberCode = "";
      if (input.userType === "STUDENT") {
        const student = await tx.student.findFirst({
          where: { id: input.userId, schoolId },
          include: { sectionRef: { include: { class: true } } },
        });
        if (!student) throw new Error("Student not found in this school tenant.");
        if (!student.isActive) throw new Error("Student account is inactive.");
        memberName = student.name;
        memberCode = student.admissionNo || student.rollNo;
      } else {
        const teacher = await tx.teacher.findFirst({
          where: { id: input.userId, schoolId },
          include: { user: { select: { name: true, email: true } } },
        });
        if (!teacher) throw new Error("Faculty member not found in this school tenant.");
        memberName = teacher.user?.name || teacher.employeeId || "Faculty Member";
        memberCode = teacher.employeeId || teacher.id;
      }

      // 2. Resolve Applicable Borrowing Policy
      const policy = await this.resolvePolicyForMember(schoolId, input.userType);

      // 3. Check Active Borrowing Limit
      const activeIssuesCount = await tx.bookIssue.count({
        where: {
          schoolId,
          userId: input.userId,
          status: { in: ["ISSUED", "OVERDUE"] },
        },
      });

      if (activeIssuesCount >= policy.maxActiveBooks) {
        throw new Error(
          `Borrowing limit exceeded: ${memberName} currently has ${activeIssuesCount} active book(s). Policy limit is ${policy.maxActiveBooks}.`
        );
      }

      // 4. Check Overdue & Fine Restrictions
      if (policy.blockOverdueBorrowing) {
        const overdueCount = await tx.bookIssue.count({
          where: {
            schoolId,
            userId: input.userId,
            status: { in: ["ISSUED", "OVERDUE"] },
            dueDate: { lt: new Date() },
          },
        });
        if (overdueCount > 0) {
          throw new Error(`Borrowing blocked: ${memberName} has ${overdueCount} overdue book(s) that must be returned first.`);
        }
      }

      if (policy.blockFineBorrowing && input.userType === "STUDENT") {
        const pendingFines = await tx.invoice.findFirst({
          where: {
            schoolId,
            studentId: input.userId,
            description: { startsWith: "Library Fine" },
            status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
          },
        });
        if (pendingFines) {
          throw new Error(`Borrowing blocked: ${memberName} has unpaid library fines.`);
        }
      }

      // 5. Select Physical Copy
      let copy: any = null;
      if (input.copyId) {
        copy = await tx.bookCopy.findFirst({
          where: { id: input.copyId, schoolId, bookId: input.bookId },
        });
        if (!copy) throw new Error("Selected physical copy not found.");
        if (copy.status !== "AVAILABLE") {
          throw new Error(`Copy ${copy.accessionNumber} is not available (Status: ${copy.status}).`);
        }
      } else {
        // Automatically find first available physical copy
        copy = await tx.bookCopy.findFirst({
          where: { bookId: input.bookId, schoolId, status: "AVAILABLE" },
          orderBy: { copyNumber: "asc" },
        });
      }

      const book = await tx.book.findFirst({ where: { id: input.bookId, schoolId } });
      if (!book) throw new Error("Book not found.");
      if (book.available <= 0 && !copy) {
        throw new Error("No physical copies available for this title.");
      }

      // 6. Calculate Due Date from Policy
      const now = new Date();
      let calculatedDueDate = new Date(now);
      if (input.dueDateOverride) {
        calculatedDueDate = new Date(input.dueDateOverride);
      } else {
        calculatedDueDate.setDate(calculatedDueDate.getDate() + policy.maxDurationDays);
      }

      // 7. Capture Policy Snapshot
      const policySnapshot = {
        policyId: policy.id,
        policyName: policy.name,
        targetGroup: policy.targetGroup,
        maxDurationDays: policy.maxDurationDays,
        dailyFineRate: Number(policy.dailyFineRate),
        gracePeriodDays: policy.gracePeriodDays,
        maxRenewalCount: policy.maxRenewalCount,
        renewalDurationDays: policy.renewalDurationDays,
        appliedAt: now.toISOString(),
      };

      // 8. Generate Unique Issue Card Number
      const cardSeq = Date.now().toString().slice(-6);
      const issueCardNumber = `CARD-${input.userType === "STUDENT" ? "STU" : "FAC"}-${cardSeq}`;

      // 9. Create Issue Record
      const issue = await tx.bookIssue.create({
        data: {
          schoolId,
          bookId: input.bookId,
          copyId: copy?.id || null,
          userId: input.userId,
          userType: input.userType,
          issueCardNumber,
          issueDate: now,
          dueDate: calculatedDueDate,
          status: "ISSUED",
          fineAmount: 0,
          issuedById: librarianId,
          maxRenewalsAllowed: policy.maxRenewalCount,
          policySnapshot,
          returnNotes: input.notes,
        },
      });

      // 10. Update Copy & Book inventory counts
      if (copy) {
        await tx.bookCopy.update({
          where: { id: copy.id },
          data: { status: "ISSUED" },
        });
      }

      await tx.book.update({
        where: { id: input.bookId },
        data: { available: { decrement: 1 } },
      });

      // 11. Close any pending student request for this book
      if (input.userType === "STUDENT") {
        await tx.bookRequest.updateMany({
          where: { schoolId, studentId: input.userId, bookId: input.bookId, status: "SUBMITTED" },
          data: { status: "APPROVED", reviewedById: librarianId, reviewedAt: now },
        });
      }

      // 12. Audit Log
      await tx.libraryAuditEvent.create({
        data: {
          schoolId,
          action: "ISSUE_BOOK",
          entityType: "BookIssue",
          entityId: issue.id,
          performedBy: librarianId,
          actorRole: "LIBRARIAN",
          details: {
            issueCardNumber,
            bookTitle: book.title,
            accessionNumber: copy?.accessionNumber,
            memberName,
            dueDate: calculatedDueDate.toISOString(),
          },
        },
      });

      logger.info({ issueId: issue.id, issueCardNumber, bookId: input.bookId }, "Book issued successfully");
      return issue;
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 4. BOOK RETURN WORKFLOW & CONDITION INSPECTION
   * ─────────────────────────────────────────────────────────────
   */

  static async returnBook(schoolId: string, issueId: string, input: ReturnBookInput, librarianId: string) {
    return prisma.$transaction(async (tx) => {
      const issue = await tx.bookIssue.findFirst({
        where: { id: issueId, schoolId },
        include: { book: true, copy: true },
      });

      if (!issue) throw new Error("Issue card not found in this school tenant.");
      if (issue.status !== "ISSUED" && issue.status !== "OVERDUE") {
        throw new Error(`Issue card is already closed (Status: ${issue.status}).`);
      }

      const now = new Date();
      const policySnap: any = issue.policySnapshot || {};
      const gracePeriod = policySnap.gracePeriodDays ?? 2;
      const dailyFineRate = policySnap.dailyFineRate ?? 5.0;

      // Calculate Overdue Days and Fines
      let overdueDays = 0;
      let fineToAssess = 0;

      if (now > issue.dueDate) {
        const msLate = now.getTime() - issue.dueDate.getTime();
        const daysLate = Math.ceil(msLate / (1000 * 3600 * 24));
        if (daysLate > gracePeriod) {
          overdueDays = daysLate;
          fineToAssess = overdueDays * dailyFineRate;
        }
      }

      if (input.manualFineOverride !== undefined) {
        fineToAssess = Math.max(0, input.manualFineOverride);
      }

      // Determine final issue and copy status based on physical condition
      let finalIssueStatus = "RETURNED";
      let finalCopyStatus = "AVAILABLE";

      if (input.condition === "LOST") {
        finalIssueStatus = "LOST";
        finalCopyStatus = "LOST";
      } else if (input.condition === "MAJOR_DAMAGE") {
        finalIssueStatus = "RETURNED_DAMAGED";
        finalCopyStatus = "DAMAGED";
      } else if (input.condition === "MINOR_DAMAGE") {
        finalIssueStatus = "RETURNED_DAMAGED";
        finalCopyStatus = "UNDER_REPAIR";
      }

      // Update Issue Record
      const updatedIssue = await tx.bookIssue.update({
        where: { id: issueId },
        data: {
          status: finalIssueStatus,
          returnDate: now,
          conditionOnReturn: input.condition,
          damageNotes: input.damageNotes,
          returnNotes: input.returnNotes,
          fineAmount: fineToAssess,
          overdueDaysCalculated: overdueDays,
          receivedById: librarianId,
        },
      });

      // Update Physical Copy Status
      if (issue.copyId) {
        await tx.bookCopy.update({
          where: { id: issue.copyId },
          data: {
            status: finalCopyStatus,
            condition: input.condition === "GOOD" ? "GOOD" : input.condition === "MINOR_DAMAGE" ? "FAIR" : "DAMAGED",
          },
        });
      }

      // If copy returned to AVAILABLE status, increment book available count
      if (finalCopyStatus === "AVAILABLE") {
        await tx.book.update({
          where: { id: issue.bookId },
          data: { available: { increment: 1 } },
        });
      }

      // Link Fine to Student Invoice if fine assessed
      if (fineToAssess > 0 && issue.userType === "STUDENT") {
        const fineDecimal = new Prisma.Decimal(fineToAssess);
        await tx.invoice.create({
          data: {
            schoolId,
            studentId: issue.userId,
            amount: fineDecimal,
            amountPaid: new Prisma.Decimal(0),
            remainingAmount: fineDecimal,
            fineAmount: new Prisma.Decimal(0),
            type: "MISCELLANEOUS",
            status: "PENDING",
            dueDate: now,
            description: `Library Fine for Book Issue ID: ${issue.id} (${issue.book?.title || "Book"})`,
          },
        });
      }

      // Audit Record
      await tx.libraryAuditEvent.create({
        data: {
          schoolId,
          action: "RETURN_BOOK",
          entityType: "BookIssue",
          entityId: issue.id,
          performedBy: librarianId,
          actorRole: "LIBRARIAN",
          details: {
            condition: input.condition,
            fineAssessed: fineToAssess,
            overdueDays,
            accessionNumber: issue.copy?.accessionNumber,
          },
        },
      });

      logger.info({ issueId, condition: input.condition, fineToAssess }, "Book returned successfully");
      return updatedIssue;
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 5. RENEWAL WORKFLOW
   * ─────────────────────────────────────────────────────────────
   */

  static async renewBook(schoolId: string, issueId: string, reason: string, librarianId: string) {
    return prisma.$transaction(async (tx) => {
      const issue = await tx.bookIssue.findFirst({
        where: { id: issueId, schoolId },
        include: { book: true, copy: true },
      });

      if (!issue) throw new Error("Issue record not found.");
      if (issue.status !== "ISSUED" && issue.status !== "OVERDUE") {
        throw new Error(`Cannot renew: book issue status is ${issue.status}.`);
      }

      if (issue.renewalCount >= issue.maxRenewalsAllowed) {
        throw new Error(`Maximum renewal limit (${issue.maxRenewalsAllowed}) already reached for this issue.`);
      }

      // Check if title has pending reservations
      const pendingRequests = await tx.bookRequest.count({
        where: { schoolId, bookId: issue.bookId, status: "SUBMITTED" },
      });
      if (pendingRequests > 0) {
        throw new Error("Renewal blocked: Another student has requested this title.");
      }

      const policySnap: any = issue.policySnapshot || {};
      const renewalDays = policySnap.renewalDurationDays ?? 7;

      const previousDueDate = issue.dueDate;
      const newDueDate = new Date(issue.dueDate);
      newDueDate.setDate(newDueDate.getDate() + renewalDays);

      const renewalNumber = issue.renewalCount + 1;

      // Create renewal audit event record
      const renewal = await tx.bookRenewal.create({
        data: {
          schoolId,
          issueId,
          renewalNumber,
          previousDueDate,
          newDueDate,
          renewedById: librarianId,
          reason,
        },
      });

      // Update issue record
      const updatedIssue = await tx.bookIssue.update({
        where: { id: issueId },
        data: {
          dueDate: newDueDate,
          renewalCount: renewalNumber,
          status: "ISSUED", // reset from overdue if renewed
        },
      });

      await tx.libraryAuditEvent.create({
        data: {
          schoolId,
          action: "RENEW_BOOK",
          entityType: "BookIssue",
          entityId: issue.id,
          performedBy: librarianId,
          actorRole: "LIBRARIAN",
          details: { renewalNumber, newDueDate: newDueDate.toISOString(), reason },
        },
      });

      return { issue: updatedIssue, renewal };
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 6. STUDENT BOOK REQUESTS
   * ─────────────────────────────────────────────────────────────
   */

  static async createStudentRequest(schoolId: string, studentId: string, bookId: string) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new Error("Student not found.");

    const book = await prisma.book.findFirst({ where: { id: bookId, schoolId } });
    if (!book) throw new Error("Book not found.");

    const existing = await prisma.bookRequest.findFirst({
      where: { schoolId, studentId, bookId, status: "SUBMITTED" },
    });
    if (existing) throw new Error("You already have an active pending request for this title.");

    return prisma.bookRequest.create({
      data: {
        schoolId,
        studentId,
        bookId,
        status: "SUBMITTED",
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7-day request window
      },
      include: { book: true },
    });
  }

  static async reviewStudentRequest(schoolId: string, requestId: string, status: "APPROVED" | "REJECTED" | "CANCELLED", notes: string, librarianId: string) {
    return prisma.bookRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewNotes: notes,
        reviewedById: librarianId,
        reviewedAt: new Date(),
      },
    });
  }

  static async listStudentRequests(schoolId: string, studentId?: string) {
    return prisma.bookRequest.findMany({
      where: {
        schoolId,
        studentId: studentId || undefined,
      },
      include: {
        book: true,
        student: { select: { id: true, name: true, admissionNo: true, rollNo: true } },
      },
      orderBy: { requestedAt: "desc" },
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 7. PERMANENT STUDENT BORROWING HISTORY & LIBRARY PROFILE
   * ─────────────────────────────────────────────────────────────
   */

  static async getStudentLibraryProfile(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { sectionRef: { include: { class: true } } },
    });
    if (!student) throw new Error("Student not found.");

    // Fetch ALL issues ever associated with this student (permanent history)
    const allIssues = await prisma.bookIssue.findMany({
      where: { schoolId, userId: studentId, userType: "STUDENT" },
      include: { book: true, copy: true, renewals: true },
      orderBy: { issueDate: "desc" },
    });

    const now = new Date();

    const totalTransactions = allIssues.length;
    const uniqueCopies = new Set(allIssues.map((i) => i.copyId).filter(Boolean)).size;
    const uniqueTitles = new Set(allIssues.map((i) => i.bookId)).size;

    const activeIssues = allIssues.filter((i) => i.status === "ISSUED" || i.status === "OVERDUE");
    const returnedIssues = allIssues.filter((i) => i.status === "RETURNED" || i.status === "RETURNED_DAMAGED");

    let returnedOnTime = 0;
    let returnedLate = 0;
    let currentlyOverdue = 0;
    let totalOverdueDays = 0;

    for (const issue of allIssues) {
      const policySnap: any = issue.policySnapshot || {};
      const grace = policySnap.gracePeriodDays ?? 2;

      if (issue.returnDate) {
        // Closed issue
        const returnTime = new Date(issue.returnDate).getTime();
        const dueTime = new Date(issue.dueDate).getTime();
        const daysLate = Math.ceil((returnTime - dueTime) / (1000 * 3600 * 24));
        if (daysLate <= grace) {
          returnedOnTime++;
        } else {
          returnedLate++;
          totalOverdueDays += daysLate;
        }
      } else {
        // Active issue
        if (now > issue.dueDate) {
          currentlyOverdue++;
          const daysLate = Math.ceil((now.getTime() - issue.dueDate.getTime()) / (1000 * 3600 * 24));
          totalOverdueDays += daysLate;
        }
      }
    }

    const damagedCount = allIssues.filter((i) => i.status === "RETURNED_DAMAGED").length;
    const lostCount = allIssues.filter((i) => i.status === "LOST").length;
    const totalRenewals = allIssues.reduce((sum, i) => sum + i.renewalCount, 0);

    const totalFinesAssessed = allIssues.reduce((sum, i) => sum + (i.fineAmount || 0), 0);
    const waivedFines = allIssues.filter((i) => i.fineWaived).reduce((sum, i) => sum + (i.fineAmount || 0), 0);

    // Get actual invoice payment status
    const studentInvoices = await prisma.invoice.findMany({
      where: {
        schoolId,
        studentId,
        description: { startsWith: "Library Fine" },
      },
    });

    const paidFines = studentInvoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + Number(inv.amountPaid), 0);

    const outstandingFines = studentInvoices
      .filter((inv) => inv.status !== "PAID")
      .reduce((sum, inv) => sum + Number(inv.remainingAmount), 0);

    // Derived on-time return percentage (excluding open active issues)
    const eligibleReturned = returnedOnTime + returnedLate;
    const onTimeReturnPercentage = eligibleReturned > 0 ? Number(((returnedOnTime / eligibleReturned) * 100).toFixed(1)) : 100.0;

    return {
      student: {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNo,
        rollNo: student.rollNo,
        class: student.sectionRef?.class?.name || "N/A",
        section: student.sectionRef?.name || "N/A",
        isActive: student.isActive,
      },
      stats: {
        totalBorrowingTransactions: totalTransactions,
        uniqueCopiesBorrowed: uniqueCopies,
        uniqueTitlesBorrowed: uniqueTitles,
        activeBooksCount: activeIssues.length,
        currentlyOverdueCount: currentlyOverdue,
        totalReturnedCount: returnedIssues.length,
        returnedOnTimeCount: returnedOnTime,
        returnedLateCount: returnedLate,
        onTimeReturnPercentage,
        damagedReturnsCount: damagedCount,
        lostBooksCount: lostCount,
        totalRenewalsCount: totalRenewals,
        totalOverdueDays,
        totalFinesAssessed,
        finesWaived: waivedFines,
        finesPaid: paidFines,
        outstandingFines,
      },
      activeIssues,
      completeHistory: allIssues,
    };
  }

  static async getStudentBorrowingHistory(schoolId: string, studentId: string) {
    return prisma.bookIssue.findMany({
      where: {
        schoolId,
        userId: studentId,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            category: true,
            shelfLocation: true,
            coverImage: true,
          },
        },
        copy: {
          select: {
            id: true,
            accessionNumber: true,
            condition: true,
          },
        },
        renewals: {
          orderBy: { renewalNumber: "asc" },
        },
      },
      orderBy: { issueDate: "desc" },
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * 8. OPERATIONAL SUMMARY & REPORTS
   * ─────────────────────────────────────────────────────────────
   */

  static async getOverviewStats(schoolId: string) {
    const totalTitles = await prisma.book.count({ where: { schoolId, isArchived: false } });
    const totalCopies = await prisma.bookCopy.count({ where: { schoolId, status: { not: "WITHDRAWN" } } });
    const availableCopies = await prisma.bookCopy.count({ where: { schoolId, status: "AVAILABLE" } });
    const issuedCopies = await prisma.bookCopy.count({ where: { schoolId, status: "ISSUED" } });
    const damagedCopies = await prisma.bookCopy.count({ where: { schoolId, status: { in: ["DAMAGED", "UNDER_REPAIR"] } } });
    const lostCopies = await prisma.bookCopy.count({ where: { schoolId, status: "LOST" } });

    const activeIssues = await prisma.bookIssue.count({
      where: { schoolId, status: { in: ["ISSUED", "OVERDUE"] } },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const soonEnd = new Date(now.getTime() + 3 * 24 * 3600 * 1000);

    const overdueIssues = await prisma.bookIssue.count({
      where: { schoolId, status: { in: ["ISSUED", "OVERDUE"] }, dueDate: { lt: now } },
    });

    const dueToday = await prisma.bookIssue.count({
      where: { schoolId, status: "ISSUED", dueDate: { gte: todayStart, lte: todayEnd } },
    });

    const dueSoon = await prisma.bookIssue.count({
      where: { schoolId, status: "ISSUED", dueDate: { gt: todayEnd, lte: soonEnd } },
    });

    const pendingRequests = await prisma.bookRequest.count({
      where: { schoolId, status: "SUBMITTED" },
    });

    // Fines overview
    const finesAggregate = await prisma.bookIssue.aggregate({
      where: { schoolId },
      _sum: { fineAmount: true },
    });

    const recentIssues = await prisma.bookIssue.findMany({
      where: { schoolId },
      take: 6,
      orderBy: { issueDate: "desc" },
      include: {
        book: { select: { title: true, author: true } },
        copy: { select: { accessionNumber: true } },
      },
    });

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      issuedCopies,
      damagedCopies,
      lostCopies,
      activeIssues,
      overdueIssues,
      dueToday,
      dueSoon,
      pendingRequests,
      totalFinesAssessed: finesAggregate._sum.fineAmount || 0,
      recentIssues,
    };
  }

  static async getMembersDirectory(schoolId: string, search?: string) {
    const studentsWhere: Prisma.StudentWhereInput = { schoolId };
    if (search) {
      studentsWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { admissionNo: { contains: search, mode: "insensitive" } },
        { rollNo: { contains: search, mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where: studentsWhere,
      take: 50,
      include: {
        sectionRef: { include: { class: true } },
      },
      orderBy: { name: "asc" },
    });

    const studentIds = students.map((s) => s.id);
    const activeIssues = await prisma.bookIssue.findMany({
      where: { schoolId, userId: { in: studentIds }, status: { in: ["ISSUED", "OVERDUE"] } },
      select: { userId: true, dueDate: true },
    });

    const now = new Date();
    return students.map((s) => {
      const studentIssues = activeIssues.filter((i) => i.userId === s.id);
      const hasOverdue = studentIssues.some((i) => i.dueDate < now);
      return {
        id: s.id,
        name: s.name,
        admissionNo: s.admissionNo || s.rollNo,
        class: s.sectionRef?.class?.name || "N/A",
        section: s.sectionRef?.name || "N/A",
        activeBorrowingCount: studentIssues.length,
        hasOverdue,
        isEligible: s.isActive && !hasOverdue,
        memberType: "STUDENT",
      };
    });
  }

  static async listActiveCards(schoolId: string) {
    return prisma.bookIssue.findMany({
      where: { schoolId, status: { in: ["ISSUED", "OVERDUE"] } },
      include: {
        book: true,
        copy: true,
        renewals: true,
      },
      orderBy: { dueDate: "asc" },
    });
  }
}
