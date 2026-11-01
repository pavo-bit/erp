import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app";
import prisma from "../../lib/prisma";

interface DatabaseIdentity {
  currentUser: string;
  databaseName: string;
  isSuperuser: boolean;
  bypassRls: boolean;
  policyCount: number;
}

const probePath = "/__wave0/database-identity";

app.get(probePath, async (_req, res, next) => {
  try {
    const [identity] = await prisma.$queryRaw<DatabaseIdentity[]>`
      SELECT current_user AS "currentUser",
             current_database() AS "databaseName",
             role.rolsuper AS "isSuperuser",
             role.rolbypassrls AS "bypassRls",
             (SELECT count(*)::int FROM pg_policy) AS "policyCount"
      FROM pg_roles AS role
      WHERE role.rolname = current_user
    `;

    if (!identity) {
      throw new Error("The current database role could not be resolved.");
    }

    res.status(200).json(identity);
  } catch (error) {
    next(error);
  }
});

describe("backend API database identity", () => {
  it("serves the restricted app role and current policy count", async () => {
    const response = await request(app).get(probePath).expect(200);
    const identity = response.body as DatabaseIdentity;

    expect(identity.currentUser).toBe("ssvm_app");
    expect(identity.isSuperuser).toBe(false);
    expect(identity.bypassRls).toBe(false);
    expect(identity.databaseName).toMatch(/(^|[_-])test($|[_-])/i);
    expect(identity.policyCount).toBeGreaterThan(0);

    console.info(
      `[W0_DB_ROLE] current_user=${identity.currentUser} ` +
        `rolsuper=${identity.isSuperuser} rolbypassrls=${identity.bypassRls} ` +
        `policy_count=${identity.policyCount} database=${identity.databaseName}`,
    );
  });
});
