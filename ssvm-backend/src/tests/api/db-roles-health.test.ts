import { describe, it, expect } from "vitest";
import { checkAllDatabaseRoles, verifyRoleHealth } from "../../lib/dbRoleHealthCheck";

describe("Database Roles & Least-Privilege Startup Health Check", () => {
  it("verifies all three roles (ssvm_app, ssvm_auth, ssvm_trusted) connect and pass all security constraints", async () => {
    const clusterHealth = await checkAllDatabaseRoles();

    expect(clusterHealth.allHealthy).toBe(true);

    // ssvm_app verification
    expect(clusterHealth.app.role).toBe("ssvm_app");
    expect(clusterHealth.app.isSuperuser).toBe(false);
    expect(clusterHealth.app.bypassesRls).toBe(false);

    // ssvm_auth verification
    expect(clusterHealth.auth.role).toBe("ssvm_auth");
    expect(clusterHealth.auth.isSuperuser).toBe(false);
    expect(clusterHealth.auth.bypassesRls).toBe(false);

    // ssvm_trusted verification
    expect(clusterHealth.trusted.role).toBe("ssvm_trusted");
    expect(clusterHealth.trusted.isSuperuser).toBe(false);
    expect(clusterHealth.trusted.bypassesRls).toBe(false);
  });

  it("fails fast if a database URL connects as a superuser", async () => {
    const adminUrl = process.env.DATABASE_URL_ADMIN || "postgresql://postgres:postgres@localhost:5433/postgres";

    await expect(
      verifyRoleHealth(adminUrl, "postgres", "app")
    ).rejects.toThrow(/Security Violation: app connection .* is running as a SUPERUSER/i);
  });
});
