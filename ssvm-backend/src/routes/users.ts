import { Router, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

// Zod schemas for validation
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ERP_ADMIN", "WEBSITE_ADMIN", "TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "ALUMNI", "PARENT", "STUDENT", "LIBRARIAN", "ASSET_MANAGER"]),
  phone: z.string().optional(),
  branchId: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  password: z.string().min(6).optional(), // Can provide one, or system generates it
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "ERP_ADMIN", "WEBSITE_ADMIN", "TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "ALUMNI", "PARENT", "STUDENT", "LIBRARIAN", "ASSET_MANAGER"]).optional(),
  phone: z.string().optional(),
  branchId: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
});

// Helper to log audit trail
async function logAudit(schoolId: string, userId: string, action: string, entity: string, entityId: string, details: any, req: any) {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action,
        entity,
        entityId: String(entityId),
        details: { ...(details || {}), userAgent: req.headers["user-agent"] },
        ipAddress: req.ip,
      },
    });
  } catch (error) {
    console.error("Failed to log audit:", error);
  }
}

// Generates a temporary password (e.g. Temp@1234)
function generateTempPassword() {
  return "Temp@" + Math.floor(1000 + Math.random() * 9000);
}

// GET /api/users - List all users
router.get("/", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: any, res: Response) => {
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

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        lastLogin: true,
        department: true,
        employeeId: true,
        branchId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// POST /api/users - Create new user
router.post("/", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already exists" });
    }

    // Workflow: Generate Temp Password if not provided
    const isTempPassword = !data.password;
    const plainPassword = data.password || generateTempPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        schoolId: req.user.schoolId,
      },
      select: { id: true, email: true, name: true, role: true }
    });

    // Audit Trail
    await logAudit(req.user.schoolId, req.user.userId, "USER_CREATED", "USER", user.id, { role: user.role, email: user.email }, req);

    res.status(201).json({ 
      success: true, 
      data: { 
        user, 
        tempPassword: isTempPassword ? plainPassword : null,
        message: isTempPassword ? "User created with temporary password. Please share this securely." : "User created successfully."
      } 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: (error as z.ZodError).errors });
    }
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
});

// PUT /api/users/:id - Edit user
router.put("/:id", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const userId = req.params.id;

    const oldUser = await prisma.user.findUnique({ where: { id: userId, schoolId: req.user.schoolId } });
    if (!oldUser) return res.status(404).json({ success: false, error: "User not found" });

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, role: true }
    });

    // Audit Trail
    if (oldUser.role !== user.role) {
      await logAudit(req.user.schoolId, req.user.userId, "ROLE_CHANGED", "USER", user.id, { oldRole: oldUser.role, newRole: user.role }, req);
    } else {
      await logAudit(req.user.schoolId, req.user.userId, "USER_EDITED", "USER", user.id, data, req);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

// PUT /api/users/:id/status - Disable/Enable User
router.put("/:id/status", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ success: false, error: "isActive must be a boolean" });

    const user = await prisma.user.update({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      data: { isActive },
      select: { id: true, email: true, isActive: true }
    });

    await logAudit(req.user.schoolId, req.user.userId, isActive ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED", "USER", user.id, { isActive }, req);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to change user status" });
  }
});

// PUT /api/users/:id/reset-password - Reset password to temp
router.put("/:id/reset-password", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: any, res: Response) => {
  try {
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      data: { password: hashedPassword },
      select: { id: true, email: true }
    });

    await logAudit(req.user.schoolId, req.user.userId, "PASSWORD_RESET", "USER", user.id, { resetBy: req.user.email }, req);

    res.json({ 
      success: true, 
      data: { tempPassword },
      message: "Password reset successful. Share this temporary password securely." 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
});

export default router;
