import { PrismaClient } from "@prisma/client";
import { encryptionExtension } from "./prismaEncryptionMiddleware";
import { getCurrentSchoolId, getSchoolContext } from "../middleware/school-context.middleware";
import logger from "./logger";

const basePrisma = new PrismaClient();

// ═══════════════════════════════════════════
// Prisma Client with Extensions (GAP 3)
// ═══════════════════════════════════════════
// Layers:
//   1. Encryption extension (PII fields)
//   2. RLS context injection (SET LOCAL app.current_school_id)
//   3. Soft delete interception

const prisma = basePrisma
  .$extends(encryptionExtension)
  .$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // ── Audit Log Impersonation Tagging ──
          if (model === 'AuditLog' && (operation === 'create' || operation === 'createMany')) {
            const context = getSchoolContext();
            if (context?.impersonatedBy) {
              if (operation === 'create') {
                (args as any).data.impersonatedBy = context.impersonatedBy;
              } else if (operation === 'createMany') {
                if (Array.isArray((args as any).data)) {
                  (args as any).data = (args as any).data.map((d: any) => ({ ...d, impersonatedBy: context.impersonatedBy }));
                } else {
                  (args as any).data.impersonatedBy = context.impersonatedBy;
                }
              }
            }
          }

          // ── RLS Context Injection ──
          // Before every query, set the PostgreSQL session variable
          // so that RLS policies can filter by tenant.
          const schoolId = getCurrentSchoolId();

          if (schoolId) {
            try {
              // SET LOCAL scopes to the current transaction only
              // This is safe for concurrent requests
              await basePrisma.$executeRawUnsafe(
                `SET LOCAL app.current_school_id = '${schoolId.replace(/'/g, "''")}'`
              );
            } catch (err) {
              // RLS context set failure should not crash the query
              // Log and continue — RLS will deny if school_id is not set
              logger.warn({ err, model, operation, schoolId }, "Failed to set RLS context");
            }
          } else {
            // No schoolId = super-admin or system context
            // Reset to empty so RLS USING clause allows all (current_tenant_id() IS NULL)
            try {
              await basePrisma.$executeRawUnsafe(
                `SET LOCAL app.current_school_id = ''`
              );
            } catch {
              // Ignore — may fail outside transaction context
            }
          }

          // ── Soft Delete Interception ──
          const softDeleteModels = ['School', 'User', 'Student', 'Teacher', 'Invoice', 'Admission', 'PaymentTransaction'];
          
          if (softDeleteModels.includes(model as string)) {
            if (operation === 'delete') {
              // @ts-ignore
              return basePrisma[model.charAt(0).toLowerCase() + model.slice(1)].update({
                where: args.where,
                data: { deletedAt: new Date() },
              });
            }
            if (operation === 'deleteMany') {
              // @ts-ignore
              return basePrisma[model.charAt(0).toLowerCase() + model.slice(1)].updateMany({
                where: args.where,
                data: { deletedAt: new Date() },
              });
            }
            if (operation === 'findUnique' || operation === 'findFirst' || operation === 'findMany' || operation === 'count') {
              // Include deleted records only if explicitly requested
              // @ts-ignore
              if (args.where?.deletedAt === undefined) {
                // @ts-ignore
                args.where = { ...args.where, deletedAt: null };
              }
              return query(args);
            }
          }
          return query(args);
        },
      },
    },
  });

export default prisma as unknown as PrismaClient;
