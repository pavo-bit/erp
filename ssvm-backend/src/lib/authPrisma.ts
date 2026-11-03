import { PrismaClient } from "@prisma/client";

let authPrismaClient: PrismaClient | null = null;

function buildExtendedAuthPrisma(baseClient: PrismaClient): PrismaClient {
  return baseClient.$extends({
    query: {
      user: {
        async findUnique({ args, query }) {
          if (args.where?.email) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_user_by_email: any }>>(
              `SELECT auth_find_user_by_email($1) AS auth_find_user_by_email`,
              args.where.email
            );
            return rows[0]?.auth_find_user_by_email || null;
          }
          if (args.where?.id) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_user_by_id: any }>>(
              `SELECT auth_find_user_by_id($1) AS auth_find_user_by_id`,
              args.where.id
            );
            return rows[0]?.auth_find_user_by_id || null;
          }
          return query(args);
        },
        async findFirst({ args, query }) {
          if (args.where?.schoolId && args.where?.role === "ERP_ADMIN") {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_school_admin: any }>>(
              `SELECT auth_find_school_admin($1) AS auth_find_school_admin`,
              args.where.schoolId as string
            );
            return rows[0]?.auth_find_school_admin || null;
          }
          return query(args);
        },
        async update({ args, query }) {
          if (args.data?.passwordHash) {
            await baseClient.$executeRawUnsafe(
              `SELECT auth_update_password_hash($1, 'USER', $2)`,
              args.where.id,
              args.data.passwordHash as string
            );
            return { id: args.where.id } as any;
          }
          if (args.data?.lastLogin) {
            const lastLogin = args.data.lastLogin instanceof Date
              ? args.data.lastLogin.toISOString()
              : args.data.lastLogin;
            await baseClient.$executeRawUnsafe(
              `SELECT auth_update_user_last_login($1, $2::timestamptz)`,
              args.where.id,
              lastLogin
            );
            return { id: args.where.id } as any;
          }
          return query(args);
        },
      },
      student: {
        async findUnique({ args, query }) {
          if (args.where?.userId) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_student_by_user_id: any }>>(
              `SELECT auth_find_student_by_user_id($1) AS auth_find_student_by_user_id`,
              args.where.userId
            );
            return rows[0]?.auth_find_student_by_user_id || null;
          }
          if (args.where?.id) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_student_by_id: any }>>(
              `SELECT auth_find_student_by_id($1) AS auth_find_student_by_id`,
              args.where.id
            );
            return rows[0]?.auth_find_student_by_id || null;
          }
          return query(args);
        },
        async findMany({ args, query }) {
          if (args.where?.admissionNo) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_student_by_admission: any }>>(
              `SELECT auth_find_student_by_admission($1, $2) AS auth_find_student_by_admission`,
              args.where.admissionNo as string,
              (args.where.schoolId as string) || null
            );
            return (rows[0]?.auth_find_student_by_admission as any[]) || [];
          }
          return query(args);
        },
        async update({ args, query }) {
          if (args.data?.password) {
            await baseClient.$executeRawUnsafe(
              `SELECT auth_update_password_hash($1, 'STUDENT', $2)`,
              args.where.id,
              args.data.password as string
            );
            return { id: args.where.id } as any;
          }
          return query(args);
        },
      },
      school: {
        async findUnique({ args, query }) {
          if (args.where?.code) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_school_by_code: any }>>(
              `SELECT auth_find_school_by_code($1) AS auth_find_school_by_code`,
              args.where.code as string
            );
            return rows[0]?.auth_find_school_by_code || null;
          }
          return query(args);
        },
      },
      refreshToken: {
        async create({ args, query }) {
          const { token, userId, expiresAt, ipAddress, userAgent } = args.data as any;
          const rows = await baseClient.$queryRawUnsafe<Array<{ auth_create_refresh_token: any }>>(
            `SELECT auth_create_refresh_token($1::text, $2::text, $3::timestamptz, $4::text, $5::text) AS auth_create_refresh_token`,
            token,
            userId,
            expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
            ipAddress || null,
            userAgent || null
          );
          return rows[0]?.auth_create_refresh_token || null;
        },
        async findUnique({ args, query }) {
          if (args.where?.token) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_refresh_token: any }>>(
              `SELECT auth_find_refresh_token($1::text) AS auth_find_refresh_token`,
              args.where.token
            );
            return rows[0]?.auth_find_refresh_token || null;
          }
          return query(args);
        },
        async update({ args, query }) {
          if (args.data?.revokedAt) {
            await baseClient.$executeRawUnsafe(
              `SELECT auth_revoke_refresh_token($1::text)`,
              args.where.id
            );
            return { id: args.where.id } as any;
          }
          return query(args);
        },
        async updateMany({ args, query }) {
          if (args.where?.userId) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_revoke_user_tokens: number }>>(
              `SELECT auth_revoke_user_tokens($1::text) AS auth_revoke_user_tokens`,
              args.where.userId as string
            );
            return { count: rows[0]?.auth_revoke_user_tokens || 0 };
          }
          return query(args);
        },
      },
      userSession: {
        async findFirst({ args, query }) {
          const userId = args.where?.userId as string;
          const fingerprint = args.where?.deviceFingerprint as string;
          if (userId && fingerprint) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_session: any }>>(
              `SELECT auth_find_session($1::text, $2::text) AS auth_find_session`,
              userId,
              fingerprint
            );
            return rows[0]?.auth_find_session || null;
          }
          return query(args);
        },
        async findMany({ args, query }) {
          if (args.where?.userId) {
            const rows = await baseClient.$queryRawUnsafe<Array<{ auth_find_active_sessions: any }>>(
              `SELECT auth_find_active_sessions($1::text) AS auth_find_active_sessions`,
              args.where.userId as string
            );
            const sessions = rows[0]?.auth_find_active_sessions || [];
            return Array.isArray(sessions) ? sessions : [];
          }
          return query(args);
        },
        async create({ args, query }) {
          const { userId, sessionId, refreshFamily, deviceFingerprint, ipAddress, expiresAt } = args.data as any;
          const rows = await baseClient.$queryRawUnsafe<Array<{ auth_create_session: any }>>(
            `SELECT auth_create_session($1::text, $2::text, $3::text, $4::text, $5::text, $6::timestamptz) AS auth_create_session`,
            userId,
            sessionId,
            refreshFamily || null,
            deviceFingerprint || null,
            ipAddress || null,
            expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt
          );
          return rows[0]?.auth_create_session || null;
        },
        async update({ args, query }) {
          const { refreshFamily, ipAddress, expiresAt } = args.data as any;
          await baseClient.$executeRawUnsafe(
            `SELECT auth_update_session($1::text, $2::text, $3::text, $4::timestamptz)`,
            args.where.id,
            refreshFamily || null,
            ipAddress || null,
            expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt
          );
          return { id: args.where.id } as any;
        },
        async updateMany({ args, query }) {
          if (args.where?.id && Array.isArray((args.where.id as any)?.in)) {
            const ids = (args.where.id as any).in as string[];
            await baseClient.$executeRawUnsafe(
              `SELECT auth_deactivate_sessions($1::text[])`,
              ids
            );
            return { count: ids.length };
          }
          const userId = args.where?.userId as string;
          const exceptSessionId = (args.where?.sessionId as any)?.not as string;
          if (userId) {
            await baseClient.$executeRawUnsafe(
              `SELECT auth_revoke_all_sessions($1::text, $2::text)`,
              userId,
              exceptSessionId || null
            );
            return { count: 1 };
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

export function getAuthPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL_AUTH;
  if (!url) {
    throw new Error(
      "DATABASE_URL_AUTH environment variable is required for auth database connection."
    );
  }

  if (!authPrismaClient || (authPrismaClient as any)._activeUrl !== url) {
    const baseClient = new PrismaClient({
      datasources: { db: { url } },
    });
    authPrismaClient = buildExtendedAuthPrisma(baseClient);
    (authPrismaClient as any)._activeUrl = url;
    (authPrismaClient as any)._baseClient = baseClient;
  }
  return authPrismaClient;
}

export function resetAuthPrisma(): void {
  if (authPrismaClient && (authPrismaClient as any)._baseClient) {
    (authPrismaClient as any)._baseClient.$disconnect().catch(() => {});
  }
  authPrismaClient = null;
}
