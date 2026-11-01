import { Prisma, PrismaClient } from "@prisma/client";
import { encryptionExtension } from "./prismaEncryptionMiddleware";
import { getCurrentSchoolId, getSchoolContext } from "../middleware/school-context.middleware";
import { TENANT_CLASSIFICATION } from "../generated/tenantClassification";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined;
}

function getTenantClassification(modelName: string) {
  return TENANT_CLASSIFICATION[modelName as keyof typeof TENANT_CLASSIFICATION];
}

function buildTenantWhere(modelName: string, schoolId: string): UnknownRecord {
  const classification = getTenantClassification(modelName);
  if (!classification || classification.classification === "global") return {};

  let scope: UnknownRecord = { schoolId };
  for (const relation of [...classification.path].reverse()) {
    scope = {
      [relation.relation]: { is: scope },
    };
  }
  return scope;
}

function flattenWhere(where: UnknownRecord): UnknownRecord {
  const result: UnknownRecord = {};
  for (const [key, val] of Object.entries(where)) {
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      const keys = Object.keys(val);
      const isOperator = keys.some((k) =>
        ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not", "is", "isNot"].includes(k)
      );
      if (!isOperator && key.includes("_")) {
        // Compound unique key like threadId_userId: { threadId, userId }
        Object.assign(result, val);
        continue;
      }
    }
    result[key] = val;
  }
  return result;
}

function addTenantWhere(modelName: string, where: unknown, schoolId: string): UnknownRecord {
  const current = flattenWhere(asRecord(where) ?? {});
  const tenantWhere = buildTenantWhere(modelName, schoolId);
  return Object.keys(current).length > 0
    ? { AND: [current, tenantWhere] }
    : tenantWhere;
}

function scopeNestedWrite(modelName: string, value: unknown, schoolId: string, depth = 0): unknown {
  if (depth > 24) throw new Error("Tenant-scoped nested write exceeds the supported relation depth.");
  if (Array.isArray(value)) return value.map((item) => scopeNestedWrite(modelName, item, schoolId, depth + 1));

  const input = asRecord(value);
  const classification = getTenantClassification(modelName);
  if (!input || !classification || classification.classification === "global") return value;

  const scoped: UnknownRecord = { ...input };
  if (classification.classification === "direct") scoped.schoolId = schoolId;

  for (const relation of classification.relations) {
    const childClassification = getTenantClassification(relation.relatedModel);
    if (!childClassification || childClassification.classification === "global") continue;
    const nestedInput = asRecord(scoped[relation.relation]);
    if (!nestedInput) continue;

    const nested: UnknownRecord = { ...nestedInput };
    for (const [action, actionValue] of Object.entries(nestedInput)) {
      const payload = asRecord(actionValue);
      if (action === "create") {
        nested[action] = scopeNestedWrite(relation.relatedModel, actionValue, schoolId, depth + 1);
      } else if (action === "createMany" && payload) {
        nested[action] = {
          ...payload,
          data: scopeNestedWrite(relation.relatedModel, payload.data, schoolId, depth + 1),
        };
      } else if (action === "connect" || action === "set" || action === "disconnect" || action === "delete" || action === "deleteMany") {
        if (typeof actionValue === "boolean" && relation.cardinality === "one") {
          nested[action] = actionValue;
          continue;
        }
        nested[action] = Array.isArray(actionValue)
          ? actionValue.map((where) => addTenantWhere(relation.relatedModel, where, schoolId))
          : addTenantWhere(relation.relatedModel, actionValue, schoolId);
      } else if (action === "connectOrCreate" && payload) {
        const entries = Array.isArray(actionValue) ? actionValue : [actionValue];
        const scopedEntries = entries.map((entry) => {
          const connectOrCreate = asRecord(entry) ?? {};
          return {
            ...connectOrCreate,
            where: addTenantWhere(relation.relatedModel, connectOrCreate.where, schoolId),
            create: scopeNestedWrite(relation.relatedModel, connectOrCreate.create, schoolId, depth + 1),
          };
        });
        nested[action] = Array.isArray(actionValue) ? scopedEntries : scopedEntries[0];
      } else if ((action === "update" || action === "updateMany" || action === "upsert") && payload) {
        if (action === "update" && relation.cardinality === "one" && !("where" in payload) && !("data" in payload)) {
          nested[action] = scopeNestedWrite(relation.relatedModel, actionValue, schoolId, depth + 1);
          continue;
        }
        const entries = Array.isArray(actionValue) ? actionValue : [actionValue];
        const scopedEntries = entries.map((entry) => {
          const write = asRecord(entry) ?? {};
          const result: UnknownRecord = { ...write };
          if ("where" in write) result.where = addTenantWhere(relation.relatedModel, write.where, schoolId);
          if ("data" in write) result.data = scopeNestedWrite(relation.relatedModel, write.data, schoolId, depth + 1);
          if ("create" in write) result.create = scopeNestedWrite(relation.relatedModel, write.create, schoolId, depth + 1);
          if ("update" in write) result.update = scopeNestedWrite(relation.relatedModel, write.update, schoolId, depth + 1);
          return result;
        });
        nested[action] = Array.isArray(actionValue) ? scopedEntries : scopedEntries[0];
      }
    }
    scoped[relation.relation] = nested;
  }

  return scoped;
}

type SoftDeleteDelegate = {
  update(where: UnknownRecord, deletedAt: Date): Promise<unknown>;
  updateMany(where: UnknownRecord, deletedAt: Date): Promise<unknown>;
};

const softDeleteDelegates: Record<string, SoftDeleteDelegate> = {
  School: {
    update: (where, deletedAt) => basePrisma.school.update({ where: where as unknown as Prisma.SchoolWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => basePrisma.school.updateMany({ where: where as unknown as Prisma.SchoolWhereInput, data: { deletedAt } }),
  },
  User: {
    update: (where, deletedAt) => basePrisma.user.update({ where: where as unknown as Prisma.UserWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => basePrisma.user.updateMany({ where: where as unknown as Prisma.UserWhereInput, data: { deletedAt } }),
  },
  Student: {
    update: (where, deletedAt) => basePrisma.student.update({ where: where as unknown as Prisma.StudentWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => basePrisma.student.updateMany({ where: where as unknown as Prisma.StudentWhereInput, data: { deletedAt } }),
  },
  Teacher: {
    update: (where, deletedAt) => basePrisma.teacher.update({ where: where as unknown as Prisma.TeacherWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => basePrisma.teacher.updateMany({ where: where as unknown as Prisma.TeacherWhereInput, data: { deletedAt } }),
  },
  Invoice: {
    update: (where, deletedAt) => basePrisma.invoice.update({ where: where as unknown as Prisma.InvoiceWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => basePrisma.invoice.updateMany({ where: where as unknown as Prisma.InvoiceWhereInput, data: { deletedAt } }),
  },
  Admission: {
    update: (where, deletedAt) => basePrisma.admission.update({ where: where as unknown as Prisma.AdmissionWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => basePrisma.admission.updateMany({ where: where as unknown as Prisma.AdmissionWhereInput, data: { deletedAt } }),
  },
  PaymentTransaction: {
    update: (where, deletedAt) => basePrisma.paymentTransaction.update({ where: where as unknown as Prisma.PaymentTransactionWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => basePrisma.paymentTransaction.updateMany({ where: where as unknown as Prisma.PaymentTransactionWhereInput, data: { deletedAt } }),
  },
};

const basePrisma = new PrismaClient();

// ═══════════════════════════════════════════
// Prisma Client with Extensions (GAP 3)
// ═══════════════════════════════════════════
// Layers:
//   1. Encryption extension (PII fields)
//   2. RLS context injection (SET LOCAL app.current_school_id)
//   3. Soft delete interception

const prismaWithEncryption = basePrisma.$extends(encryptionExtension);

const prisma = prismaWithEncryption
  .$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // ── Audit Log Impersonation Tagging ──
          if (model === 'AuditLog' && (operation === 'create' || operation === 'createMany')) {
            const context = getSchoolContext();
            if (context?.impersonatedBy) {
              const mutableArgs = asRecord(args);
              const data = mutableArgs?.data;
              if (operation === 'create') {
                const record = asRecord(data);
                if (record && mutableArgs) mutableArgs.data = { ...record, impersonatedBy: context.impersonatedBy };
              } else if (mutableArgs && Array.isArray(data)) {
                mutableArgs.data = data.map((entry) => {
                  const record = asRecord(entry);
                  return record ? { ...record, impersonatedBy: context.impersonatedBy } : entry;
                });
              } else if (mutableArgs) {
                const record = asRecord(data);
                if (record) mutableArgs.data = { ...record, impersonatedBy: context.impersonatedBy };
              }
            }
          }

          // ── Application-Level Tenant Isolation ──
          const schoolId = getCurrentSchoolId();
          const classification = model ? getTenantClassification(model) : undefined;
          const softDeleteDelegate = model ? softDeleteDelegates[model] : undefined;
          const mutableArgs = asRecord(args) ?? {};
          const where = asRecord(mutableArgs.where) ?? {};

          // Apply soft delete filter where applicable
          if (softDeleteDelegate && (operation === 'findUnique' || operation === 'findUniqueOrThrow' || operation === 'findFirst' || operation === 'findFirstOrThrow' || operation === 'findMany' || operation === 'count')) {
            if (where.deletedAt === undefined) {
              mutableArgs.where = { ...where, deletedAt: null };
            }
          }

          if (softDeleteDelegate && operation === 'delete') {
            if (schoolId && classification && classification.classification !== "global") {
              const delegate = (prismaWithEncryption as any)[model];
              if (delegate) {
                const flatWhere = flattenWhere(asRecord(mutableArgs.where) ?? {});
                const existing = await delegate.findFirst({
                  where: addTenantWhere(model, flatWhere, schoolId),
                  select: { id: true },
                });
                if (!existing) {
                  const err = new Error(`An operation failed because it depends on one or more records that were required but not found.`);
                  (err as any).code = "P2025";
                  throw err;
                }
              }
            }
            return softDeleteDelegate.update(asRecord(mutableArgs.where) ?? {}, new Date());
          }

          if (softDeleteDelegate && operation === 'deleteMany') {
            let finalWhere = asRecord(mutableArgs.where) ?? {};
            if (schoolId && classification && classification.classification !== "global") {
              finalWhere = addTenantWhere(model, finalWhere, schoolId);
            }
            return softDeleteDelegate.updateMany(finalWhere, new Date());
          }

          if (schoolId && classification && classification.classification !== "global") {
            const delegate = (prismaWithEncryption as any)[model];

            if (operation === "findUnique" || operation === "findUniqueOrThrow") {
              const flatWhere = flattenWhere(asRecord(mutableArgs.where) ?? {});
              const queryArgs = {
                ...mutableArgs,
                where: addTenantWhere(model, flatWhere, schoolId),
              };
              if (operation === "findUnique") {
                return delegate.findFirst(queryArgs);
              } else {
                return delegate.findFirstOrThrow(queryArgs);
              }
            }

            if (operation === "update" || operation === "delete") {
              const flatWhere = flattenWhere(asRecord(mutableArgs.where) ?? {});
              const existing = await delegate.findFirst({
                where: addTenantWhere(model, flatWhere, schoolId),
                select: { id: true },
              });
              if (!existing) {
                const err = new Error(`An operation failed because it depends on one or more records that were required but not found.`);
                (err as any).code = "P2025";
                throw err;
              }
              if (operation === "update" && "data" in mutableArgs) {
                mutableArgs.data = scopeNestedWrite(model, mutableArgs.data, schoolId);
              }
              return query(mutableArgs as typeof args);
            }

            if (operation === "upsert") {
              const flatWhere = flattenWhere(asRecord(mutableArgs.where) ?? {});
              const existing = await delegate.findFirst({
                where: addTenantWhere(model, flatWhere, schoolId),
              });
              if (existing) {
                return delegate.update({
                  where: mutableArgs.where,
                  data: scopeNestedWrite(model, mutableArgs.update, schoolId),
                });
              } else {
                return delegate.create({
                  data: scopeNestedWrite(model, mutableArgs.create, schoolId),
                });
              }
            }

            const generalWhereOps = new Set([
              "findFirst", "findFirstOrThrow", "findMany", "count",
              "updateMany", "updateManyAndReturn", "deleteMany", "aggregate", "groupBy"
            ]);
            if (generalWhereOps.has(operation)) {
              mutableArgs.where = addTenantWhere(model, mutableArgs.where, schoolId);
            }

            const writeDataOps = new Set(["create", "createMany", "createManyAndReturn", "updateMany", "updateManyAndReturn"]);
            if (writeDataOps.has(operation) && "data" in mutableArgs) {
              mutableArgs.data = scopeNestedWrite(model, mutableArgs.data, schoolId);
            }
          }

          if (softDeleteDelegate && (operation === 'findUnique' || operation === 'findUniqueOrThrow')) {
            const delegate = (prismaWithEncryption as any)[model];
            if (delegate) {
              if (operation === "findUnique") {
                return delegate.findFirst(mutableArgs);
              } else {
                return delegate.findFirstOrThrow(mutableArgs);
              }
            }
          }

          return query(mutableArgs as typeof args);
        },
      },
    },
  });

export default prisma as unknown as PrismaClient;
