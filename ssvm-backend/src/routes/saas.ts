import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole } from "../middleware/auth";
import { saasRequestLimiter } from "../middleware/rateLimiter";
import { verifyTurnstile, spamQualityValidation, PublicFormRequest } from "../middleware/turnstile";
import { hashPassword } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// 1. Submit a new SaaS Registration Request (Public)
router.post("/request", saasRequestLimiter, verifyTurnstile, spamQualityValidation, async (req: PublicFormRequest, res) => {
  try {
    if (req.spamSuspected) {
      return res.status(201).json({ success: true, message: "Request submitted successfully" });
    }

    const { schoolName, principalName, email, phone, address, expectedStudents } = req.body;

    if (!schoolName || !principalName || !email || !phone) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const existingRequest = await prisma.schoolRegistrationRequest.findUnique({ where: { email } });
    if (existingRequest) {
      return res.status(400).json({ success: false, error: "A request with this email already exists" });
    }

    const request = await prisma.schoolRegistrationRequest.create({
      data: {
        schoolName,
        principalName,
        email,
        phone,
        address,
      },
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    console.error("SaaS Request Error:", error);
    res.status(500).json({ success: false, error: "Failed to submit request" });
  }
});

// 2. Get all Registration Requests (Super Admin Only)
router.get("/requests", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const requests = await prisma.schoolRegistrationRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch requests" });
  }
});

// 3. Approve a Registration Request (Super Admin Only)
router.post("/approve/:id", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.schoolRegistrationRequest.findUnique({ where: { id: id as string } });
    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({ success: false, error: `Request is already ${request.status}` });
    }

    // Wrap in a transaction to ensure atomic creation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark request as APPROVED
      await tx.schoolRegistrationRequest.update({
        where: { id: id as string },
        data: { status: "APPROVED" },
      });

      // 2. Create the School Tenant
      const school = await tx.school.create({
        data: {
          code: `SCH-${Date.now()}`,
          name: request.schoolName,
          address: request.address || "",
          email: request.email,
          phone: request.phone || "",
          status: "ACTIVE",
          website: "",
        },
      });

      // 3. Create the ERP Admin User for this School
      const hashedPassword = await hashPassword("Admin@123");
      const adminUser = await tx.user.create({
        data: {
          email: request.email,
          passwordHash: hashedPassword,
          name: request.principalName || "",
          role: "ERP_ADMIN",
          schoolId: school.id,
          phone: request.phone || "",
        },
      });

      return { school, adminUser };
    });

    res.json({ success: true, data: result, message: "School approved and ERP Admin created successfully" });
  } catch (error) {
    console.error("Approve Request Error:", error);
    res.status(500).json({ success: false, error: "Failed to approve request" });
  }
});

// 4. Reject a Registration Request (Super Admin Only)
router.post("/reject/:id", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.schoolRegistrationRequest.findUnique({ where: { id: id as string } });
    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }

    await prisma.schoolRegistrationRequest.update({
      where: { id: id as string },
      data: { status: "REJECTED" },
    });

    res.json({ success: true, message: "Request rejected successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to reject request" });
  }
});

export default router;
