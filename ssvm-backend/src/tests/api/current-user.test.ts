import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app";

interface DatabaseIdentity {
  currentUser: string;
  databaseName: string;
  isSuperuser: boolean;
  bypassRls: boolean;
  policyCount: number;
}

const probePath = "/api/v1/health/database-identity";

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
