import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const portals = ["erp-admin", "teacher-portal", "super-admin", "payment-portal", "parent-portal", "saas-frontend", "student-portal"];

describe("portal API client parity", () => {
  it("keeps CSRF and single-refresh behavior in all seven portal clients", () => {
    for (const portal of portals) {
      const file = portal === "erp-admin" ? resolve(process.cwd(), "src/lib/api-hooks.ts") : portal === "student-portal" ? resolve(process.cwd(), "../student-portal/lib/student-api-hooks.ts") : portal === "super-admin" ? resolve(process.cwd(), "../super-admin/src/lib/api.ts") : resolve(process.cwd(), "../" + portal + "/src/lib/api-hooks.ts");
      const source = readFileSync(file, "utf8");
      expect(source, portal + " must read CSRF from response headers").toContain('response.headers.get("X-CSRF-Token")');
      expect(source, portal + " must use the one-retry auth flow").toContain("fetchWithAuthRetry");
      expect(source, portal + " must redirect after refresh failure").toContain('window.location.assign("/login")');
    }
  });
});
