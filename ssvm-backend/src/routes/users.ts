import { createAuditLog } from "../lib/audit";
import { Router, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { authenticate, requireRole, requireDirectRole, AuthRequest, hashPassword } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";
import crypto from "crypto";
import { mailService } from "../services/mail.service";
import { runWithTenantDatabaseTransaction } from "../lib/prisma";

const router = Router();

// Zod schemas for validation
export const ASSIGNABLE_ROLES: Record<string, readonly string[]> = {
  ERP_ADMIN: ["WEBSITE_ADMIN", "TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "ALUMNI", "PARENT", "STUDENT", "LIBRARIAN", "ASSET_MANAGER"],
};
export function isLastSchoolAdminDemotion(targetRole: string, nextRole: string | undefined, activeAdminCount: number): boolean {
  return targetRole === "ERP_ADMIN" && nextRole !== undefined && nextRole !== "ERP_ADMIN" && activeAdminCount <= 1;
}
const SCHOOL_USER_ROLES = ASSIGNABLE_ROLES.ERP_ADMIN;

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["WEBSITE_ADMIN", "TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "ALUMNI", "PARENT", "STUDENT", "LIBRARIAN", "ASSET_MANAGER"]),
  phone: z.string().optional(),
  branchId: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["WEBSITE_ADMIN", "TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "ALUMNI", "PARENT", "STUDENT", "LIBRARIAN", "ASSET_MANAGER"]).optional(),
  phone: z.string().optional(),
  branchId: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
});

// Helper to log audit trail
async function logAudit(schoolId: string, userId: string, action: string, entity: string, entityId: string, details: any, req: any) {
  try {
    await createAuditLog({
      data: {
        schoolId,
        userId,
        action,
        entity,
        entityId: String(entityId),
        details: { ...(details || {}), userAgent: req.headers["user-agent"] },
        ipAddress: (req.ip as string) || "Unknown",
      },
    });
  } catch (error) {
    console.error("Failed to log audit:", error);
  }
}

function generateTempPassword() { return crypto.randomBytes(32).toString("base64url"); }

const ASSIGNABLE_ROLES: Record<string, string[]> = {
  SUPER_ADMIN: ["SUPER_ADMIN", "ERP_ADMIN", "WEBSITE_ADMIN", "TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "ALUMNI", "PARENT", "STUDENT", "LIBRARIAN", "ASSET_MANAGER"],
  ERP_ADMIN: ["WEBSITE_ADMIN", "TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "ALUMNI", "PARENT", "STUDENT", "LIBRARIAN", "ASSET_MANAGER"],
};

function canAssignRole(assignerRole: string, targetRole: string): boolean {
  return (ASSIGNABLE_ROLES[assignerRole] || []).includes(targetRole);
}

function isProtectedAccount(user: any): boolean {
  return user?.role === "SUPER_ADMIN";
}

// GET /api/users - List all users
router.get("/", authenticate, requireRole("ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const { role, status, search } = req.query;
    
    let whereClause: any = { schoolId: req.user.schoolId };
    if (role) whereClause.role = role;
    if (status) whereClause.isActive = status === "active";
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { employeeId: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const paginationParams = parsePaginationParams(req.query, ['name', 'email', 'createdAt']);

    const result = await paginatedQuery(
      prisma.user,
      whereClause,
      undefined,
      paginationParams
    );

    // Filter sensitive info like passwordHash just in case, though select is better. But paginatedQuery doesn't support select yet. We should map it.
    const safeData = result.data.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone,
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      department: u.department,
      employeeId: u.employeeId,
      branchId: u.branchId,
      createdAt: u.createdAt,
    }));

    res.json({ success: true, data: safeData, pagination: result.pagination });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// POST /api/users - Create new user
router.post("/", authenticate, requireRole("ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    if (!canAssignRole(req.user.role, data.role)) {
      return res.status(403).json({ success: false, error: "Forbidden — cannot assign this role" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already exists" });
    }

    // Until invitation delivery is configured, create a cryptographically random
    // one-time secret and never expose it through the API.
    const plainPassword = generateTempPassword();
    const hashedPassword = await hashPassword(plainPassword);

    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash: hashedPassword,
        schoolId: req.user.schoolId,
        mustChangePassword: true,
      },
      select: { id: true, email: true, name: true, role: true }
    });

    // Audit Trail
    await logAudit(req.user.schoolId, req.user.id, "USER_CREATED", "USER", user.id, { role: user.role, email: user.email }, req);

    res.status(201).json({ 
      success: true, 
      data: { 
        user, 
        message: "User created. Password setup must be provisioned securely."
      } 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
});

// PUT /api/users/:id - Edit user
router.put("/:id", authenticate, requireRole("ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const userId = req.params.id;

    const oldUser = await prisma.user.findUnique({ where: { id: userId, schoolId: req.user.schoolId } });
    if (!oldUser) return res.status(404).json({ success: false, error: "User not found" });
    if (oldUser.role === "ERP_ADMIN" && data.role) {
      const activeAdminCount = await prisma.user.count({ where: { schoolId: req.user.schoolId, role: "ERP_ADMIN", isActive: true } });
      if (isLastSchoolAdminDemotion(oldUser.role, data.role, activeAdminCount)) return res.status(409).json({ success: false, error: "Cannot demote the last school administrator" });
    }
    if (oldUser.role === "SUPER_ADMIN" || oldUser.role === "ERP_ADMIN") return res.status(403).json({ success: false, error: "Protected administrator account" });
    if (data.role && !SCHOOL_USER_ROLES.includes(data.role)) return res.status(403).json({ success: false, error: "Role is not assignable" });
    const user = await prisma.user.update({
      where: { id: userId, schoolId: req.user.schoolId },
      data,
      select: { id: true, name: true, role: true }
    });

    // Audit Trail
    if (oldUser.role !== user.role) {
      await logAudit(req.user.schoolId, req.user.id, "ROLE_CHANGED", "USER", user.id, { before: { role: oldUser.role }, after: { role: user.role } }, req);
    } else {
      await logAudit(req.user.schoolId, req.user.id, "USER_EDITED", "USER", user.id, data, req);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

// PUT /api/users/:id/status - Disable/Enable User
router.put("/:id/status", authenticate, requireRole("ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ success: false, error: "isActive must be a boolean" });

    const target = await prisma.user.findFirst({ where: { id: req.params.id, schoolId: req.user.schoolId } });
    if (!target) return res.status(404).json({ success: false, error: "User not found" });
    if (target.id === req.user.id || target.role === "SUPER_ADMIN" || target.role === "ERP_ADMIN") return res.status(403).json({ success: false, error: "Protected administrator account" });
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, email: true, isActive: true }
    });

    await logAudit(req.user.schoolId, req.user.id, isActive ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED", "USER", user.id, { isActive }, req);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to change user status" });
  }
});

// PUT /api/users/:id/reset-password - Reset password to temp
router.put("/:id/reset-password", authenticate, requireRole("ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id, schoolId: req.user.schoolId } });
    if (!existing) return res.status(404).json({ success: false, error: "User not found" });
    if (isProtectedAccount(existing)) {
      return res.status(403).json({ success: false, error: "Protected account cannot be modified" });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const target = await prisma.user.findFirst({ where: { id: req.params.id, schoolId: req.user.schoolId } });
    if (!target || target.role === "SUPER_ADMIN" || target.role === "ERP_ADMIN") return res.status(404).json({ success: false, error: "User not found" });
    const user = await prisma.user.update({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      data: { passwordHash: hashedPassword, mustChangePassword: true, passwordChangedAt: new Date() },
      select: { id: true, email: true }
    });

    await prisma.refreshToken.updateMany({ where: { userId: user.id, isRevoked: false }, data: { isRevoked: true, revokedAt: new Date() } });
    await logAudit(req.user.schoolId, req.user.id, "PASSWORD_RESET", "USER", user.id, { resetBy: req.user.email }, req);

    res.json({ 
      success: true, 
      data: { userId: user.id },
      message: "Password reset. Password setup must be provisioned securely."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
});

// POST /api/users/:id/password-setup - Issue a password setup token (ERP_ADMIN only, own school)
router.post("/:id/password-setup", authenticate, requireDirectRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id, schoolId: req.user.schoolId } });
    if (!existing) return res.status(404).json({ success: false, error: "User not found" });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Revoke previous unused tokens for this user
    await prisma.passwordSetupToken.updateMany({
      where: { userId: existing.id, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.passwordSetupToken.create({
      data: {
        schoolId: req.user.schoolId,
        userId: existing.id,
        tokenHash,
        expiresAt,
        createdBy: req.user.userId,
      },
    });

    const link = `${process.env.FRONTEND_URL || "http://localhost:3000"}/set-password?token=${rawToken}`;
    await mailService.sendPasswordSetupEmail(existing.email, link);

    // In non-production, log the link only if EMAIL_DEV_LOG=true (handled in mail service).
    // Never return token/password in API response.
    res.status(201).json({ success: true, message: "Password setup link sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to issue password setup token" });
  }
});

// POST /api/users/:id/password-setup/resend
router.post("/:id/password-setup/resend", authenticate, requireDirectRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: any, res: Response) => {
  // Revoke all existing and issue a new one
  await prisma.passwordSetupToken.updateMany({
    where: { userId: req.params.id, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  // delegate to issue by re-invoking create logic via redirect-like call: just create new
  const existing = await prisma.user.findUnique({ where: { id: req.params.id, schoolId: req.user.schoolId } });
  if (!existing) return res.status(404).json({ success: false, error: "User not found" });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.passwordSetupToken.create({
    data: {
      schoolId: req.user.schoolId,
      userId: existing.id,
      tokenHash,
      expiresAt,
      createdBy: req.user.userId,
    },
  });

  const link = `${process.env.FRONTEND_URL || "http://localhost:3000"}/set-password?token=${rawToken}`;
  await mailService.sendPasswordSetupEmail(existing.email, link);

  res.status(201).json({ success: true, message: "Password setup link resent" });
});

// POST /api/users/:id/password-setup/revoke
router.post("/:id/password-setup/revoke", authenticate, requireDirectRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: any, res: Response) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id, schoolId: req.user.schoolId } });
  if (!existing) return res.status(404).json({ success: false, error: "User not found" });

  await prisma.passwordSetupToken.updateMany({
    where: { userId: existing.id, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  res.json({ success: true, message: "Password setup tokens revoked" });
});

export default router;
