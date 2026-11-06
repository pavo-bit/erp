import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ASSIGNABLE_ROLES, isLastSchoolAdminDemotion } from "../../routes/users";

describe("ERP user administration contract", () => {
  const assigners = Object.keys(ASSIGNABLE_ROLES);
  const assignable = [...new Set(Object.values(ASSIGNABLE_ROLES).flat())];

  it("defines every assigner/role cell explicitly and excludes platform roles", () => {
    expect(assigners).toEqual(["ERP_ADMIN"]);
    for (const actor of ["ERP_ADMIN", "SUPER_ADMIN", "TEACHER", "ACCOUNTANT"]) {
      for (const role of ["SUPER_ADMIN", "ERP_ADMIN", "WEBSITE_ADMIN", "TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "ALUMNI", "PARENT", "STUDENT", "LIBRARIAN", "ASSET_MANAGER"]) {
        expect(ASSIGNABLE_ROLES[actor]?.includes(role) ?? false).toBe(actor === "ERP_ADMIN" && assignable.includes(role));
      }
    }
  });

  it("does not permit self promotion or assigning another ERP administrator", () => {
    expect(ASSIGNABLE_ROLES.ERP_ADMIN).not.toContain("SUPER_ADMIN");
    expect(ASSIGNABLE_ROLES.ERP_ADMIN).not.toContain("ERP_ADMIN");
  });

  it("refuses demotion when the target is the school's last active ERP administrator", () => {
    expect(isLastSchoolAdminDemotion("ERP_ADMIN", "TEACHER", 1)).toBe(true);
    expect(isLastSchoolAdminDemotion("ERP_ADMIN", "TEACHER", 0)).toBe(true);
    expect(isLastSchoolAdminDemotion("ERP_ADMIN", "TEACHER", 2)).toBe(false);
    expect(isLastSchoolAdminDemotion("TEACHER", "STUDENT", 1)).toBe(false);
    expect(isLastSchoolAdminDemotion("ERP_ADMIN", undefined, 1)).toBe(false);
  });

  it("keeps generated password handling private and removes default credentials", async () => {
    const users = fs.readFileSync(path.resolve(process.cwd(), "src/routes/users.ts"), "utf8");
    const saas = fs.readFileSync(path.resolve(process.cwd(), "src/routes/saas.ts"), "utf8");
    const auth = fs.readFileSync(path.resolve(process.cwd(), "src/middleware/auth.ts"), "utf8");
    expect(users).not.toMatch(/tempPassword\s*:/i);
    expect(users).toContain("crypto.randomBytes(32)");
    expect(users).toContain("mustChangePassword: true");
    expect(users).toContain("req.user.id");
    expect(users).not.toContain("req.user.userId");
    expect(users).toContain("before: { role: oldUser.role }");
    expect(users).toContain("after: { role: user.role }");
    expect(saas).not.toContain("Admin@123");
    expect(saas).toContain("mustChangePassword: true");
    expect(auth.slice(auth.indexOf("export function requireRole"), auth.indexOf("export function requireSuperAdmin"))).not.toContain("userDelegation");
  });
});
