import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, hashPassword, verifyPassword, signToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../validators/schemas";

const router = Router();

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { student: true, parent: { include: { children: { include: { user: { select: { name: true } } } } } }, alumni: true },
    });

    if (!user) { res.status(401).json({ success: false, error: "Invalid credentials" }); return; }
    if (!user.isActive) { res.status(403).json({ success: false, error: "Account deactivated" }); return; }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      logger.warn({ email }, "Failed login attempt");
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });

    res.cookie("auth_token", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production" && process.env.FRONTEND_URL?.startsWith("https"),
      sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/",
    });

    const { password: _, ...userWithoutPw } = user;
    logger.info({ userId: user.id, role: user.role }, "User logged in");
    res.json({ success: true, data: { token, user: userWithoutPw } });
  } catch (e) {
    logger.error({ err: e }, "Login error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/auth/alumni/register (public)
router.post("/alumni/register", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, phone, batch, currentRole, company } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: "Email, password, and name are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) { res.status(409).json({ success: false, error: "Email already registered" }); return; }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        password: hashed,
        name,
        role: "ALUMNI",
        phone: phone || null,
        alumni: {
          create: {
            batch: batch || "",
            currentRole: currentRole || null,
            company: company || null,
          }
        }
      },
      include: { alumni: true }
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });

    res.cookie("auth_token", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production" && process.env.FRONTEND_URL?.startsWith("https"),
      sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/",
    });

    const { password: _, ...userWithoutPw } = user;
    logger.info({ userId: user.id, role: user.role }, "New Alumni registered");
    res.status(201).json({ success: true, data: { token, user: userWithoutPw } });
  } catch (e) {
    logger.error({ err: e }, "Alumni register error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/auth/register (admin only)
router.post("/register", authenticate, requireRole("ADMIN"), validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role, phone, ...profileData } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ success: false, error: "Email already registered" }); return; }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email, password: hashed, name, role, phone: phone || null,
        ...(role === "STUDENT" && profileData.class ? { student: { create: { rollNo: profileData.rollNo || "", class: profileData.class, section: profileData.section || "A", session: profileData.session || "2025-26", guardianName: profileData.guardianName || null, parentId: profileData.parentId || null } } } : {}),
        ...(role === "PARENT" ? { parent: { create: { occupation: profileData.occupation || null, address: profileData.address || null } } } : {}),
        ...(role === "ALUMNI" ? { alumni: { create: { batch: profileData.batch || "", currentRole: profileData.currentRole || null, company: profileData.company || null, achievement: profileData.achievement || null } } } : {}),
      },
      include: { student: true, parent: true, alumni: true },
    });
    const { password: _, ...safe } = user;
    logger.info({ userId: user.id, role: user.role, createdBy: req.user!.id }, "User registered");
    res.status(201).json({ success: true, data: safe });
  } catch (e) {
    logger.error({ err: e }, "Register error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, isActive: true, createdAt: true,
        student: true,
        parent: { include: { children: { include: { user: { select: { name: true } } } } } },
        alumni: true,
      },
    });
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    res.json({ success: true, data: user });
  } catch (e) {
    logger.error({ err: e }, "Me error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res: Response) => {
  res.clearCookie("auth_token");
  res.json({ success: true, data: { message: "Logged out" } });
});

export default router;
