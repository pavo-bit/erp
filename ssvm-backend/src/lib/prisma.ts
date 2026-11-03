import { Prisma, PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "async_hooks";
import { encryptionExtension } from "./prismaEncryptionMiddleware";
import { getCurrentSchoolId, getSchoolContext, runWithSchoolContext } from "../middleware/school-context.middleware";
import { TENANT_CLASSIFICATION } from "../generated/tenantClassification";

const inTxStorage = new AsyncLocalStorage<boolean>();
const activeTxStorage = new AsyncLocalStorage<Prisma.TransactionClient>();
const activeTenantSchoolIdStorage = new AsyncLocalStorage<string>();

const basePrisma = new PrismaClient();

function getEffectiveClient(): any {
  return activeTxStorage.getStore() || basePrisma;
}

export async function runWithTenantDatabaseTransaction<T>(
  schoolId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }
): Promise<T> {
  const existingTx = activeTxStorage.getStore();
  const activeSchoolId = activeTenantSchoolIdStorage.getStore();

  if (existingTx) {
    if (activeSchoolId && activeSchoolId !== schoolId) {
      throw new Error(`Cannot switch tenant context inside active transaction from '${activeSchoolId}' to '${schoolId}'.`);
    }
    if (!activeSchoolId && inTxStorage.getStore()) {
      throw new Error(`Cannot start tenant transaction for '${schoolId}' inside an active trusted transaction.`);
    }
    return fn(existingTx);
  }

  return inTxStorage.run(true, () => {
    return (basePrisma as any).$transaction(async (tx: Prisma.TransactionClient) => {
      await (tx as any).$executeRaw`SELECT set_config('app.current_school_id', ${schoolId}, true);`;
      const proxyTx = new Proxy(tx, {
        get(target, prop, receiver) {
          const orig = Reflect.get(target, prop, receiver);
          const propStr = typeof prop === "string" ? prop : "";
          const modelName = propStr ? (propStr.charAt(0).toUpperCase() + propStr.slice(1)) : "";
          if (propStr && (propStr in softDeleteDelegates || modelName in softDeleteDelegates)) {
            const delegateKey = propStr in softDeleteDelegates ? propStr : modelName;
            return new Proxy(orig, {
              get(modelTarget, modelProp, modelReceiver) {
                if (modelProp === "delete") {
                  return async (args: any) => {
                    const flatWhere = flattenWhere(asRecord(args?.where) ?? {});
                    const existing = await modelTarget.findFirst({
                      where: addTenantWhere(delegateKey, flatWhere, schoolId),
                      select: { id: true },
                    });
                    if (!existing) {
                      const err = new Error(`An operation failed because it depends on one or more records that were required but not found.`);
                      (err as any).code = "P2025";
                      throw err;
                    }
                    return modelTarget.update({
                      where: { id: existing.id },
                      data: { deletedAt: new Date() },
                    });
                  };
                }
                if (modelProp === "deleteMany") {
                  return async (args: any) => {
                    const finalWhere = addTenantWhere(delegateKey, asRecord(args?.where) ?? {}, schoolId);
                    return modelTarget.updateMany({
                      where: finalWhere,
                      data: { deletedAt: new Date() },
                    });
                  };
                }
                return Reflect.get(modelTarget, modelProp, modelReceiver);
              }
            });
          }
          return orig;
        }
      });
      return activeTxStorage.run(proxyTx, () => {
        return activeTenantSchoolIdStorage.run(schoolId, () => {
          return runWithSchoolContext(schoolId, () => fn(proxyTx));
        });
      });
    }, options);
  });
}

const TRUSTED_PURPOSES = new Set([
  "ADMIN_AUDIT",
  "SUPER_ADMIN_SEARCH",
  "PAYMENTS_WEBHOOK",
] as const);

export async function runWithTrustedDatabaseTransaction<T>(
  context: { purpose: string; actorId?: string },
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!TRUSTED_PURPOSES.has(context.purpose as any)) {
    throw new Error(`Unauthorized or unknown trusted purpose: ${context.purpose}`);
  }
  const existingTx = activeTxStorage.getStore();
  if (existingTx) {
    return fn(existingTx);
  }

  return inTxStorage.run(true, () => {
    return (basePrisma as any).$transaction(async (tx: Prisma.TransactionClient) => {
      await (tx as any).$executeRawUnsafe(
        `SELECT set_config('app.trusted_purpose', $1, true), set_config('app.actor_id', $2, true);`,
        context.purpose,
        context.actorId || "SYSTEM"
      );
      return activeTxStorage.run(tx, () => fn(tx));
    });
  });
}

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
      [relation.relation]: (relation.cardinality as string) === "many" ? { some: scope } : scope,
    };
  }
  return scope;
}

export function isCompoundUniqueKey(key: string, val: UnknownRecord): boolean {
  if (!key.includes("_")) return false;
  const innerKeys = Object.keys(val);
  if (innerKeys.length < 2) return false;

  // None of the inner keys can be Prisma filter or relation operators
  const filterOperators = [
    "some", "every", "none", "is", "isNot",
    "equals", "in", "notIn", "lt", "lte", "gt", "gte",
    "contains", "startsWith", "endsWith", "mode", "not",
  ];
  if (innerKeys.some((k) => filterOperators.includes(k))) {
    return false;
  }

  // Real compound unique keys in Prisma are named by joining field names (e.g., threadId_userId: { threadId, userId })
  const outerParts = key.split("_");
  return innerKeys.every((innerKey) => outerParts.includes(innerKey));
}

export function flattenWhere(where: UnknownRecord): UnknownRecord {
  const result: UnknownRecord = {};
  for (const [key, val] of Object.entries(where)) {
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      if (isCompoundUniqueKey(key, val as UnknownRecord)) {
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
    update: (where, deletedAt) => (getEffectiveClient().school || getEffectiveClient().School).update({ where: where as unknown as Prisma.SchoolWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => (getEffectiveClient().school || getEffectiveClient().School).updateMany({ where: where as unknown as Prisma.SchoolWhereInput, data: { deletedAt } }),
  },
  User: {
    update: (where, deletedAt) => (getEffectiveClient().user || getEffectiveClient().User).update({ where: where as unknown as Prisma.UserWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => (getEffectiveClient().user || getEffectiveClient().User).updateMany({ where: where as unknown as Prisma.UserWhereInput, data: { deletedAt } }),
  },
  Student: {
    update: (where, deletedAt) => (getEffectiveClient().student || getEffectiveClient().Student).update({ where: where as unknown as Prisma.StudentWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => (getEffectiveClient().student || getEffectiveClient().Student).updateMany({ where: where as unknown as Prisma.StudentWhereInput, data: { deletedAt } }),
  },
  Teacher: {
    update: (where, deletedAt) => (getEffectiveClient().teacher || getEffectiveClient().Teacher).update({ where: where as unknown as Prisma.TeacherWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => (getEffectiveClient().teacher || getEffectiveClient().Teacher).updateMany({ where: where as unknown as Prisma.TeacherWhereInput, data: { deletedAt } }),
  },
  Invoice: {
    update: (where, deletedAt) => (getEffectiveClient().invoice || getEffectiveClient().Invoice).update({ where: where as unknown as Prisma.InvoiceWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => (getEffectiveClient().invoice || getEffectiveClient().Invoice).updateMany({ where: where as unknown as Prisma.InvoiceWhereInput, data: { deletedAt } }),
  },
  Admission: {
    update: (where, deletedAt) => (getEffectiveClient().admission || getEffectiveClient().Admission).update({ where: where as unknown as Prisma.AdmissionWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => (getEffectiveClient().admission || getEffectiveClient().Admission).updateMany({ where: where as unknown as Prisma.AdmissionWhereInput, data: { deletedAt } }),
  },
  PaymentTransaction: {
    update: (where, deletedAt) => (getEffectiveClient().paymentTransaction || getEffectiveClient().PaymentTransaction).update({ where: where as unknown as Prisma.PaymentTransactionWhereUniqueInput, data: { deletedAt } }),
    updateMany: (where, deletedAt) => (getEffectiveClient().paymentTransaction || getEffectiveClient().PaymentTransaction).updateMany({ where: where as unknown as Prisma.PaymentTransactionWhereInput, data: { deletedAt } }),
  },
};

softDeleteDelegates.student = softDeleteDelegates.Student;
softDeleteDelegates.user = softDeleteDelegates.User;
softDeleteDelegates.school = softDeleteDelegates.School;
softDeleteDelegates.teacher = softDeleteDelegates.Teacher;
softDeleteDelegates.invoice = softDeleteDelegates.Invoice;
softDeleteDelegates.admission = softDeleteDelegates.Admission;
softDeleteDelegates.paymentTransaction = softDeleteDelegates.PaymentTransaction;

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
    client: {
      async $transaction(arg: any, options?: any) {
        return inTxStorage.run(true, () => {
          return (basePrisma as any).$transaction(arg, options);
        });
      },
    },
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // ── Active Transaction Delegation ──
          const activeTx = activeTxStorage.getStore();
          if (activeTx && model) {
            const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
            const txDelegate = (activeTx as any)[delegateName] || (activeTx as any)[model];
            if (txDelegate && typeof txDelegate[operation] === "function") {
              return txDelegate[operation](args);
            }
          }

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
          const context = getSchoolContext();
          const isSuperAdmin = context?.isSuperAdmin ?? false;
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
            if (!inTxStorage.getStore() && schoolId && classification && classification.classification !== "global") {
              // Fall through to transaction wrapper below
            } else {
              let targetWhere = asRecord(mutableArgs.where) ?? {};
              if (schoolId && classification && classification.classification !== "global") {
                const client = getEffectiveClient() as any;
                const delegate = client[model] || client[model.charAt(0).toLowerCase() + model.slice(1)] || (prismaWithEncryption as any)[model] || (prismaWithEncryption as any)[model.charAt(0).toLowerCase() + model.slice(1)];
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
                  targetWhere = { id: existing.id };
                }
              }
              return softDeleteDelegate.update(targetWhere, new Date());
            }
          }

          if (softDeleteDelegate && operation === 'deleteMany') {
            let finalWhere = asRecord(mutableArgs.where) ?? {};
            if (schoolId && classification && classification.classification !== "global") {
              finalWhere = addTenantWhere(model, finalWhere, schoolId);
            }
            return softDeleteDelegate.updateMany(finalWhere, new Date());
          }

          if (schoolId && classification && classification.classification !== "global") {
            if (operation === "findUnique" || operation === "findUniqueOrThrow") {
              const flatWhere = flattenWhere(asRecord(mutableArgs.where) ?? {});
              mutableArgs.where = addTenantWhere(model, flatWhere, schoolId);
            } else if (operation === "update" || operation === "delete") {
              const flatWhere = flattenWhere(asRecord(mutableArgs.where) ?? {});
              mutableArgs.where = addTenantWhere(model, flatWhere, schoolId);
              if (operation === "update" && "data" in mutableArgs) {
                mutableArgs.data = scopeNestedWrite(model, mutableArgs.data, schoolId);
              }
            } else if (operation === "upsert") {
              const flatWhere = flattenWhere(asRecord(mutableArgs.where) ?? {});
              mutableArgs.where = addTenantWhere(model, flatWhere, schoolId);
              if ("update" in mutableArgs) {
                mutableArgs.update = scopeNestedWrite(model, mutableArgs.update, schoolId);
              }
              if ("create" in mutableArgs) {
                mutableArgs.create = scopeNestedWrite(model, mutableArgs.create, schoolId);
              }
            } else {
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
          }

          if (schoolId && !inTxStorage.getStore() && classification && classification.classification !== "global") {
            return inTxStorage.run(true, () => {
              return (basePrisma as any).$transaction(async (tx: any) => {
                await (tx as any).$executeRaw`SELECT set_config('app.current_school_id', ${schoolId}, true);`;
                const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
                const txDelegate = tx[delegateName] || tx[model];
                if (txDelegate) {
                  if (operation === "findUnique") {
                    return txDelegate.findFirst(mutableArgs);
                  }
                  if (operation === "findUniqueOrThrow") {
                    return txDelegate.findFirstOrThrow(mutableArgs);
                  }
                  if (operation === "update" || operation === "delete") {
                    const existing = await txDelegate.findFirst({
                      where: mutableArgs.where,
                      select: { id: true },
                    });
                    if (!existing) {
                      const err = new Error(`An operation failed because it depends on one or more records that were required but not found.`);
                      (err as any).code = "P2025";
                      throw err;
                    }
                    if (operation === "delete" && softDeleteDelegate) {
                      return (txDelegate || (tx as any)[model]).update({
                        where: { id: existing.id },
                        data: { deletedAt: new Date() }
                      });
                    }
                    return txDelegate[operation]({
                      ...mutableArgs,
                      where: { id: existing.id }
                    });
                  }
                  if (operation === "upsert") {
                    const existing = await txDelegate.findFirst({
                      where: mutableArgs.where,
                      select: { id: true },
                    });
                    if (existing) {
                      return txDelegate.update({
                        where: { id: existing.id },
                        data: mutableArgs.update,
                      });
                    } else {
                      return txDelegate.create({
                        data: mutableArgs.create,
                      });
                    }
                  }
                  if (typeof txDelegate[operation] === "function") {
                    return txDelegate[operation](mutableArgs);
                  }
                }
                return query(mutableArgs as typeof args);
              });
            });
          }

          if (!schoolId && !isSuperAdmin && !inTxStorage.getStore() && classification && classification.classification !== "global") {
            const writeOps = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany", "upsert"]);
            if (writeOps.has(operation)) {
              throw new Error(`Tenant context required for write operation '${operation}' on tenant table '${model}'.`);
            }
            return inTxStorage.run(true, () => {
              return (basePrisma as any).$transaction(async (tx: any) => {
                await (tx as any).$executeRaw`SELECT set_config('app.current_school_id', '', true);`;
                const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
                const txDelegate = tx[delegateName] || tx[model];
                if (operation === "findUnique" || operation === "findFirst") return null;
                if (operation === "findUniqueOrThrow" || operation === "findFirstOrThrow") {
                  const err = new Error(`An operation failed because it depends on one or more records that were required but not found.`);
                  (err as any).code = "P2025";
                  throw err;
                }
                if (operation === "findMany") return [];
                if (operation === "count") return 0;
                if (operation === "aggregate") return { _count: 0 };
                if (operation === "groupBy") return [];
                if (txDelegate && typeof txDelegate[operation] === "function") {
                  return txDelegate[operation](mutableArgs);
                }
                return query(mutableArgs as typeof args);
              });
            });
          }

          if (softDeleteDelegate && (operation === 'findUnique' || operation === 'findUniqueOrThrow')) {
            const delegateKey = model in (prismaWithEncryption as any) ? model : (model.charAt(0).toLowerCase() + model.slice(1));
            const delegate = (prismaWithEncryption as any)[delegateKey];
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
