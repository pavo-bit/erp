import { Router, Request, Response } from "express";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import logger from "../lib/logger";
import { authenticate } from "../middleware/auth";
import { ActivityType, Prisma, PrismaClient } from "@prisma/client";
import { getRedisClient, isRedisAvailable } from "../lib/redis";

const router = Router();
const PUBLIC_STATS_CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * GET /api/v1/stats/public
 * Public landing metrics (explicit, cached, aggregate-only, zero personal data).
 * No hardcoded defaults: pass rate and average computed from real marks and school pass settings;
 * academic session dynamically resolved from active session.
 */
router.get("/public", async (req: Request, res: Response): Promise<void> => {
  try {
    const requestedSchoolId = typeof req.query.schoolId === "string" ? req.query.schoolId : undefined;
    const cacheKey = `stats:public:${requestedSchoolId || "platform"}`;

    // 1. Check Redis Cache
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        if (redis) {
          const cached = await redis.get(cacheKey);
          if (cached) {
            res.setHeader("Cache-Control", `public, max-age=${PUBLIC_STATS_CACHE_TTL_SECONDS}, s-maxage=${PUBLIC_STATS_CACHE_TTL_SECONDS}`);
            res.setHeader("X-Cache", "HIT");
            res.json(JSON.parse(cached));
            return;
          }
        }
      } catch (err: unknown) {
        logger.warn({ err }, "Redis read failed for public stats cache; falling back to DB");
      }
    }

    // 2. Compute stats within tenant transaction if schoolId is provided (Postgres RLS)
    const computeStats = async (db: Prisma.TransactionClient | PrismaClient) => {
      // Resolve Active Academic Session (dynamic from DB, never hardcoded)
      const activeSession = requestedSchoolId
        ? await db.academicSession.findFirst({
            where: { schoolId: requestedSchoolId, isCurrent: true },
            select: { id: true, name: true },
          })
        : await db.academicSession.findFirst({
            where: { isCurrent: true },
            orderBy: { startDate: "desc" },
            select: { id: true, name: true },
          });

      // Compute Real Academic Exam Performance (no fake defaults like 98%)
      const marks = await db.studentMark.findMany({
        where: {
          ...(requestedSchoolId ? { student: { schoolId: requestedSchoolId, deletedAt: null } } : {}),
          ...(activeSession ? { examSubject: { exam: { classRef: { sessionId: activeSession.id } } } } : {}),
        },
        include: {
          examSubject: {
            select: {
              passMarks: true,
              maxMarks: true,
            },
          },
        },
      });

      let passRate: number | null = null;
      let averageScore: number | null = null;

      const validMarks = marks.filter((m) => (m.examSubject?.maxMarks ?? 0) > 0);
      if (validMarks.length > 0) {
        const passedCount = validMarks.filter((m) => {
          const passMark = m.examSubject?.passMarks ?? 33;
          return m.marksObtained >= passMark;
        }).length;
        passRate = Math.round((passedCount / validMarks.length) * 10000) / 100;

        const totalPercentage = validMarks.reduce(
          (sum, m) => sum + (m.marksObtained / m.examSubject!.maxMarks) * 100,
          0
        );
        averageScore = Math.round((totalPercentage / validMarks.length) * 100) / 100;
      }

      // Aggregate Counts
      const [studentCount, teacherCount] = await Promise.all([
        db.student.count({
          where: {
            ...(requestedSchoolId ? { schoolId: requestedSchoolId } : {}),
            isActive: true,
            deletedAt: null,
          },
        }),
        db.teacher.count({
          where: {
            ...(requestedSchoolId ? { schoolId: requestedSchoolId } : {}),
            isActive: true,
            deletedAt: null,
          },
        }),
      ]);

      return {
        academicSession: activeSession?.name || null,
        studentCount,
        teacherCount,
        passRate,
        averageScore,
        totalExamsEvaluated: validMarks.length,
      };
    };

    const data = requestedSchoolId
      ? await runWithTenantDatabaseTransaction(requestedSchoolId, (tx) => computeStats(tx))
      : await computeStats(prisma);

    const responsePayload = {
      success: true,
      isPublic: true,
      scope: "PUBLIC_AGGREGATE",
      asOf: new Date().toISOString(),
      data,
    };

    // 5. Populate Cache
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        if (redis) {
          await redis.setex(cacheKey, PUBLIC_STATS_CACHE_TTL_SECONDS, JSON.stringify(responsePayload));
        }
      } catch (err: unknown) {
        logger.warn({ err }, "Redis write failed for public stats cache");
      }
    }

    res.setHeader("Cache-Control", `public, max-age=${PUBLIC_STATS_CACHE_TTL_SECONDS}, s-maxage=${PUBLIC_STATS_CACHE_TTL_SECONDS}`);
    res.setHeader("X-Cache", "MISS");
    res.json(responsePayload);
  } catch (e: unknown) {
    logger.error({ err: e }, "Public stats fetch error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/v1/stats/activity-feed - Paginated and filtered activity feed
router.get("/activity-feed", authenticate, async (req, res): Promise<void> => {
  try {
    const { page = "1", limit = "10", type } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const schoolId = (req as any).user?.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: "School context required" });
      return;
    }

    const whereClause: Record<string, unknown> = { schoolId };
    if (type) {
      whereClause.type = type as ActivityType;
    }

    const activities = await prisma.activityLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    const total = await prisma.activityLog.count({ where: whereClause });

    res.json({
      success: true,
      data: activities,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Activity feed fetch error");
    res.status(500).json({ success: false, error: "Failed to fetch activity feed" });
  }
});

export default router;
