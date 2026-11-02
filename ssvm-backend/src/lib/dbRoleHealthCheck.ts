import { PrismaClient } from "@prisma/client";
import logger from "./logger";

export interface RoleHealthResult {
  role: string;
  isSuperuser: boolean;
  bypassesRls: boolean;
  healthy: boolean;
  error?: string;
}

export interface DatabaseClusterHealth {
  app: RoleHealthResult;
  auth: RoleHealthResult;
  trusted: RoleHealthResult;
  allHealthy: boolean;
}

export async function verifyRoleHealth(url: string, expectedRoleName: string, roleType: "app" | "auth" | "trusted"): Promise<RoleHealthResult> {
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });

  try {
    await client.$connect();

    const roleInfo = await client.$queryRawUnsafe<
      Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>
    >(`SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user`);

    if (!roleInfo || roleInfo.length === 0) {
      throw new Error(`Failed to inspect current_user from pg_roles for ${expectedRoleName}`);
    }

    const { current_user, rolsuper, rolbypassrls } = roleInfo[0];

    // 1. Must never run as a superuser
    if (rolsuper) {
      throw new Error(`Security Violation: ${roleType} connection (${current_user}) is running as a SUPERUSER!`);
    }

    // 2. Production roles (app, auth, trusted) must never have BYPASSRLS
    if (rolbypassrls) {
      throw new Error(`Security Violation: ${roleType} connection (${current_user}) has BYPASSRLS enabled!`);
    }

    // 3. Expected role name check (warn/enforce)
    if (current_user !== expectedRoleName) {
      logger.warn({ expected: expectedRoleName, actual: current_user }, `Role name differs from default recommendation`);
    }

    // 4. Role-specific privilege boundary checks
    if (roleType === "auth") {
      // Must have SELECT on users
      const hasSelect = await client.$queryRawUnsafe<Array<{ has: boolean }>>(
        `SELECT has_table_privilege(current_user, 'users', 'SELECT') AS has`
      );
      if (!hasSelect[0]?.has) {
        throw new Error(`ssvm_auth is missing required SELECT privilege on users`);
      }

      // Must NOT have INSERT on users
      const hasInsert = await client.$queryRawUnsafe<Array<{ has: boolean }>>(
        `SELECT has_table_privilege(current_user, 'users', 'INSERT') AS has`
      );
      if (hasInsert[0]?.has) {
        throw new Error(`Security Violation: ssvm_auth has unauthorized INSERT privilege on users`);
      }

      // Must NOT have SELECT on invoices
      const hasInvoiceSelect = await client.$queryRawUnsafe<Array<{ has: boolean }>>(
        `SELECT has_table_privilege(current_user, 'invoices', 'SELECT') AS has`
      );
      if (hasInvoiceSelect[0]?.has) {
        throw new Error(`Security Violation: ssvm_auth has unauthorized SELECT privilege on invoices`);
      }
    } else if (roleType === "trusted") {
      // Must have SELECT on payment_transactions
      const hasTxSelect = await client.$queryRawUnsafe<Array<{ has: boolean }>>(
        `SELECT has_table_privilege(current_user, 'payment_transactions', 'SELECT') AS has`
      );
      if (!hasTxSelect[0]?.has) {
        throw new Error(`ssvm_trusted is missing required privilege on payment_transactions`);
      }

      // Must have INSERT on audit_logs
      const hasAuditInsert = await client.$queryRawUnsafe<Array<{ has: boolean }>>(
        `SELECT has_table_privilege(current_user, 'audit_logs', 'INSERT') AS has`
      );
      if (!hasAuditInsert[0]?.has) {
        throw new Error(`ssvm_trusted is missing required INSERT privilege on audit_logs`);
      }
    }

    return {
      role: current_user,
      isSuperuser: rolsuper,
      bypassesRls: rolbypassrls,
      healthy: true,
    };
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

export async function checkAllDatabaseRoles(): Promise<DatabaseClusterHealth> {
  const appUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  const authUrl = process.env.DATABASE_URL_AUTH;
  const trustedUrl = process.env.DATABASE_URL_TRUSTED;

  if (!appUrl) throw new Error("DATABASE_URL or DATABASE_URL_TEST is not set.");
  if (!authUrl) throw new Error("DATABASE_URL_AUTH is not set.");
  if (!trustedUrl) throw new Error("DATABASE_URL_TRUSTED is not set.");

  const [appResult, authResult, trustedResult] = await Promise.all([
    verifyRoleHealth(appUrl, "ssvm_app", "app"),
    verifyRoleHealth(authUrl, "ssvm_auth", "auth"),
    verifyRoleHealth(trustedUrl, "ssvm_trusted", "trusted"),
  ]);

  return {
    app: appResult,
    auth: authResult,
    trusted: trustedResult,
    allHealthy: appResult.healthy && authResult.healthy && trustedResult.healthy,
  };
}
