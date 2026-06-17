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

          // ── Application-Level Tenant Isolation ──
          // Prisma connection pooling prevents reliable `SET LOCAL` outside of
          // explicit interactive transactions. To strictly enforce tenant isolation,
          // we dynamically inject `schoolId` into every query for tenant-scoped models.
          const schoolId = getCurrentSchoolId();

          const tenantScopedModels = [
            'Student', 'Teacher', 'Invoice', 'PaymentTransaction', 'FeeCategory',
            'FeeStructure', 'FineRule', 'Attendance', 'Event', 'Assignment',
            'StudyMaterial', 'Admission', 'Salary', 'Notification', 'AuditLog',
            'ActivityLog', 'Document', 'Book', 'LedgerTransaction', 'SystemLog',
            'SchoolFeature', 'SubscriptionPayment', 'UnifiedTemplate', 'UsageMetric',
            'Vendor', 'VisitorLog', 'WebhookEndpoint'
          ];

          if (schoolId && tenantScopedModels.includes(model as string)) {
            // Inject schoolId into WHERE clauses
            if (['findUnique', 'findFirst', 'findMany', 'count', 'update', 'updateMany', 'delete', 'deleteMany', 'aggregate', 'groupBy'].includes(operation)) {
              // Convert findUnique to findFirst if we're injecting a non-unique WHERE clause
              if (operation === 'findUnique') {
                operation = 'findFirst';
              }
              (args as any).where = { ...(args as any).where, schoolId };
            }
            // Inject schoolId into CREATE payloads
            else if (operation === 'create') {
              (args as any).data = { ...(args as any).data, schoolId };
            } else if (operation === 'createMany') {
              if (Array.isArray((args as any).data)) {
                (args as any).data = (args as any).data.map((d: any) => ({ ...d, schoolId }));
              } else {
                (args as any).data = { ...(args as any).data, schoolId };
              }
            } else if (operation === 'upsert') {
              (args as any).where = { ...(args as any).where, schoolId };
              (args as any).create = { ...(args as any).create, schoolId };
              (args as any).update = { ...(args as any).update, schoolId }; // Though update might not strictly need it if where has it
            }
          }

          // ── Soft Delete Interception ──
          const softDeleteModels = ['School', 'User', 'Student', 'Teacher', 'Invoice', 'Admission', 'PaymentTransaction'];
          
          if (softDeleteModels.includes(model as string)) {
            if (operation === 'delete') {
              // @ts-ignore
              return basePrisma[model.charAt(0).toLowerCase() + model.slice(1)].update({
                where: (args as any).where,
                data: { deletedAt: new Date() },
              });
            }
            if (operation === 'deleteMany') {
              // @ts-ignore
              return basePrisma[model.charAt(0).toLowerCase() + model.slice(1)].updateMany({
                where: (args as any).where,
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
