import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = Router();

// GET /api/search?q={query}
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.json({ success: true, data: { students: [], teachers: [], guardians: [], invoices: [], assignments: [], admissions: [], events: [], notices: [], attendance: [], results: [], alumni: [] } });
      return;
    }

    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string || undefined) : req.user!.schoolId;
    if (!schoolId && req.user!.role !== "SUPER_ADMIN") {
      res.status(400).json({ success: false, error: "School ID required" }); return;
    }

    const whereSchool = schoolId ? { schoolId } : {};
    
    // For raw queries, we format the query for tsquery
    const tsQuery = query.split(/\s+/).map(word => `${word}:*`).join(" & ");
    // For ILIKE trigram
    const likeQuery = `%${query}%`;

    // Concurrent search queries across 13 major entities
    // Using Prisma's fullTextSearch feature if enabled, or trigram via contains
    // Since we created pg_trgm indexes, contains mode insensitive will use them!
    const [students, teachers, guardians, invoices, assignments, admissions, events, notices, attendance, results, alumni, documents, commLogs] = await Promise.all([
      prisma.student.findMany({
        where: {
          ...whereSchool,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { rollNo: { contains: query, mode: "insensitive" } },
          ]
        },
        take: 5,
        select: { id: true, name: true, rollNo: true, sectionId: true, sectionRef: { select: { name: true, class: { select: { name: true } } } } }
      }),
      prisma.teacher.findMany({
        where: {
          ...whereSchool,
          user: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ]
          }
        },
        take: 5,
        include: { user: { select: { name: true, email: true } }, department: true }
      }),
      prisma.guardian.findMany({
        where: {
          ...whereSchool,
          OR: [
            { primaryName: { contains: query, mode: "insensitive" } },
            { secondaryName: { contains: query, mode: "insensitive" } },
            { primaryPhone: { contains: query, mode: "insensitive" } }
          ]
        },
        take: 5,
        include: { students: { select: { name: true } } }
      }),
      prisma.invoice.findMany({
        where: {
          ...whereSchool,
          OR: [
            { receiptNo: { contains: query, mode: "insensitive" } },
          ]
        },
        take: 5,
        include: { student: { select: { name: true } } }
      }),
      prisma.assignment.findMany({
        where: {
          ...whereSchool,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, title: true, dueDate: true, classRef: { select: { name: true } }, subjectRef: { select: { name: true } } }
      }),
      prisma.admission.findMany({
        where: {
          ...whereSchool,
          OR: [
            { applicantName: { contains: query, mode: "insensitive" } },
            { parentName: { contains: query, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, applicantName: true, parentName: true, status: true }
      }),
      prisma.event.findMany({
        where: {
          ...whereSchool,
          OR: [
            { title: { contains: query, mode: "insensitive" } }, // FTS
            { description: { contains: query, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, title: true, date: true, category: true }
      }),
      prisma.notice.findMany({
        where: {
          ...whereSchool,
          OR: [
            { title: { contains: query, mode: "insensitive" } }, // FTS
            { content: { contains: query, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, title: true, category: true, status: true, createdAt: true }
      }),
      prisma.attendance.findMany({
        where: {
          ...whereSchool,
          student: {
            name: { contains: query, mode: "insensitive" }
          }
        },
        take: 5,
        select: { id: true, date: true, status: true, student: { select: { name: true } } }
      }),
      prisma.studentMark.findMany({
        where: {
          student: {
            name: { contains: query, mode: "insensitive" },
            ...(schoolId ? { schoolId } : {})
          }
        },
        take: 5,
        select: { id: true, marksObtained: true, grade: true, student: { select: { name: true } }, examSubject: { select: { exam: { select: { name: true } } } } }
      }),
      prisma.alumni.findMany({
        where: {
          user: {
            ...(schoolId ? { schoolId } : {}),
            name: { contains: query, mode: "insensitive" }
          }
        },
        take: 5,
        select: { id: true, batch: true, currentRole: true, user: { select: { name: true } } }
      }),
      prisma.documentRepository.findMany({
        where: {
          ...whereSchool,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, name: true, category: true, createdAt: true }
      }),
      prisma.communicationLog.findMany({
        where: {
          ...whereSchool,
          OR: [
            { content: { contains: query, mode: "insensitive" } },
            { type: { contains: query, mode: "insensitive" } },
            { recipientNum: { contains: query, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, channel: true, type: true, content: true, status: true, sentAt: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        students: students.map((s: any) => ({
          id: s.id, 
          name: s.name, 
          rollNo: s.rollNo,
          className: s.sectionRef ? `${s.sectionRef.class.name} - ${s.sectionRef.name}` : "Unassigned"
        })),
        teachers: teachers.map((t: any) => ({ 
          id: t.id, 
          name: t.user?.name, 
          email: t.user?.email, 
          department: t.department?.name 
        })),
        guardians: guardians.map((g: any) => ({
          id: g.id,
          name: g.primaryName,
          students: g.students.map((s: any) => s.name).join(", ")
        })),
        invoices: invoices.map((i: any) => ({ 
          id: i.id, 
          receiptNo: i.receiptNo, 
          amount: i.amount, 
          status: i.status, 
          studentName: i.student?.name 
        })),
        assignments: assignments.map((a: any) => ({
          id: a.id,
          title: a.title,
          dueDate: a.dueDate,
          subject: a.subjectRef?.name,
          class: a.classRef?.name
        })),
        admissions: admissions.map((a: any) => ({
          id: a.id,
          studentName: a.applicantName,
          parentName: a.parentName,
          status: a.status
        })),
        events: events.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          category: e.category
        })),
        notices: notices.map((n: any) => ({
          id: n.id,
          title: n.title,
          category: n.category,
          status: n.status,
          date: n.createdAt
        })),
        attendance: attendance.map((a: any) => ({
          id: a.id,
          studentName: a.student?.name,
          date: a.date,
          status: a.status
        })),
        results: results.map((r: any) => ({
          id: r.id,
          studentName: r.student?.name,
          examName: r.examSubject?.exam?.name,
          grade: r.grade,
          totalMarks: r.marksObtained
        })),
        alumni: alumni.map((a: any) => ({
          id: a.id,
          name: a.user?.name,
          graduationYear: a.batch,
          profession: a.currentRole
        })),
        documents: documents.map((d: any) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          uploadedBy: d.uploadedBy?.name,
          date: d.createdAt
        })),
        communicationLogs: commLogs.map((c: any) => ({
          id: c.id,
          channel: c.channel,
          type: c.type,
          preview: c.content.substring(0, 50) + (c.content.length > 50 ? "..." : ""),
          status: c.status,
          date: c.sentAt
        }))
      }
    });

  } catch (e) {
    logger.error({ err: e }, "Global search error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
