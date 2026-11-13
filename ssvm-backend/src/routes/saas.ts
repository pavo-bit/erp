import prisma, { runWithTenantDatabaseTransaction } from '../lib/prisma';
import crypto from "crypto";
import { Router } from "express";

import { authenticate, requireRole } from "../middleware/auth";
import { saasRequestLimiter } from "../middleware/rateLimiter";
import { verifyTurnstile, spamQualityValidation, PublicFormRequest } from "../middleware/turnstile";
import { hashPassword } from "../middleware/auth";
import { seedDefaultChartOfAccounts } from "../lib/chartOfAccounts";
import { ModuleRegistryService } from "../services/module-registry.service";

const router = Router();

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

      // 3. Seed Default Chart of Accounts
      await seedDefaultChartOfAccounts(tx, school.id);

      // 4. Create the ERP Admin User for this School
      const hashedPassword = await hashPassword(crypto.randomBytes(32).toString("base64url"));
      const adminUser = await tx.user.create({
        data: {
          email: request.email,
          passwordHash: hashedPassword,
          name: request.principalName || "",
          role: "ERP_ADMIN",
          schoolId: school.id,
          mustChangePassword: true,
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

// ═══════════════════════════════════════════════════════════════════════════
// 5. Multi-Step Tenant Provisioning Pipeline (Phase 6 Core Gate)
// ═══════════════════════════════════════════════════════════════════════════
router.post("/provision", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const {
      schoolName,
      schoolCode,
      email,
      phone,
      address,
      principalName,
      adminPassword,
      planId,
      classes = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
      feeCategories = ["Tuition Fee", "Admission Fee", "Exam Fee", "Transport Fee", "Library Fee"],
    } = req.body;

    if (!schoolName || !email || !principalName) {
      return res.status(400).json({ success: false, error: "schoolName, email, and principalName are required" });
    }

    const effectiveCode = schoolCode || `SCH-${Date.now().toString(36).toUpperCase()}`;
    const existingSchool = await prisma.school.findFirst({
      where: { OR: [{ code: effectiveCode }, { email }] },
    });
    if (existingSchool) {
      return res.status(409).json({ success: false, error: "School with this code or email already exists" });
    }

    // 1. Create School Record (Global platform model)
    const school = await prisma.school.create({
      data: {
        code: effectiveCode,
        name: schoolName,
        email,
        phone: phone || "",
        address: address || "",
        status: "ACTIVE",
        website: "",
        onboardingDone: true,
      },
    });

    // 2. Perform Tenant Setup inside Tenant Scoped Transaction (enforces app.current_school_id)
    const result = await runWithTenantDatabaseTransaction(school.id, async (tx) => {
      // Seed Default Chart of Accounts (COA)
      await seedDefaultChartOfAccounts(tx, school.id);

      // Create Default Academic Session (2026-2027)
      const currentYear = new Date().getFullYear();
      const academicSession = await tx.academicSession.create({
        data: {
          schoolId: school.id,
          name: `${currentYear}-${currentYear + 1}`,
          startDate: new Date(currentYear, 3, 1), // April 1
          endDate: new Date(currentYear + 1, 2, 31), // March 31
          isCurrent: true,
        },
      });

      // Create Standard Classes & Sections
      for (let i = 0; i < classes.length; i++) {
        await tx.class.create({
          data: {
            schoolId: school.id,
            sessionId: academicSession.id,
            name: classes[i],
            sortOrder: i,
            sections: {
              create: [{ name: "A" }, { name: "B" }],
            },
          },
        });
      }

      // Create Default Fee Categories
      for (const catName of feeCategories) {
        await tx.feeCategory.create({
          data: {
            schoolId: school.id,
            name: catName,
          },
        });
      }

      // Create Default Fine Rule
      await tx.fineRule.create({
        data: {
          schoolId: school.id,
          code: "LATE_FEE",
          name: "Late Payment Fine",
          graceDays: 7,
          fineAmount: 50.0,
          isPercentage: false,
          frequency: "ONCE",
          isActive: true,
        },
      });

      // Seed Default School Settings
      await tx.schoolSettings.create({
        data: {
          schoolId: school.id,
          timezone: "Asia/Kolkata",
          currency: "INR",
          dateFormat: "DD/MM/YYYY",
          language: "en",
          academicYear: `${currentYear}-${currentYear + 1}`,
          attendanceMethod: "DAILY",
          gradingSystem: "CBSE",
        },
      });

      // Create School ERP Admin User
      const plainPassword = adminPassword || crypto.randomBytes(12).toString("base64url");
      const hashedPassword = await hashPassword(plainPassword);
      
      const adminDbUrl = process.env.DATABASE_URL_TEST_FIXTURE || process.env.DIRECT_URL || process.env.DATABASE_URL_ADMIN;
      let adminUser;
      if (adminDbUrl) {
        const { PrismaClient } = await import("@prisma/client");
        const adminPrisma = new PrismaClient({ datasources: { db: { url: adminDbUrl } } });
        try {
          adminUser = await adminPrisma.user.create({
            data: {
              email,
              passwordHash: hashedPassword,
              name: principalName,
              role: "ERP_ADMIN",
              schoolId: school.id,
              mustChangePassword: !adminPassword,
              phone: phone || "",
            },
          });
        } finally {
          await adminPrisma.$disconnect();
        }
      } else {
        adminUser = await tx.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            name: principalName,
            role: "ERP_ADMIN",
            schoolId: school.id,
            mustChangePassword: !adminPassword,
            phone: phone || "",
          },
        });
      }

      // Attach Subscription Plan if provided
      let subscription = null;
      if (planId) {
        const plan = await tx.subscriptionPlanConfig.findUnique({ where: { id: planId } });
        if (plan) {
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);
          subscription = await tx.subscription.create({
            data: {
              schoolId: school.id,
              planId: plan.id,
              status: "ACTIVE",
              startDate: new Date(),
              endDate,
              amount: plan.fixedPrice,
            },
          });
        }
      }

      // Mark Onboarding Progress as 100% Complete
      await tx.onboardingProgress.create({
        data: {
          schoolId: school.id,
          profileCompleted: true,
          academicSetupCompleted: true,
          classesSectionsCompleted: true,
          feeStructureSetup: true,
          teachersAdded: false,
          studentsImported: false,
        },
      });

      return {
        school,
        adminUser: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
        temporaryPassword: adminPassword ? undefined : plainPassword,
        subscription,
      };
    });

    res.status(201).json({
      success: true,
      message: "School provisioned and configured successfully with all default modules.",
      data: result,
    });
  } catch (error: any) {
    console.error("Provisioning Pipeline Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to provision school" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Super Admin Platform Analytics & Real-Time Metrics (Phase 6)
// ═══════════════════════════════════════════════════════════════════════════
router.get("/metrics", authenticate, requireRole("SUPER_ADMIN"), async (_req, res) => {
  try {
    const [
      totalSchools,
      activeSchools,
      totalStudents,
      totalTeachers,
      totalInvoices,
      totalPaidInvoices,
      subscriptions,
      recentRegistrations,
    ] = await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { status: "ACTIVE" } }),
      prisma.student.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: { isActive: true } }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "PAID" } }),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.schoolRegistrationRequest.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, schoolName: true, principalName: true, email: true, status: true, createdAt: true },
      }),
    ]);

    const revenueAggregation = await prisma.invoice.aggregate({
      _sum: { amountPaid: true },
    });

    res.json({
      success: true,
      data: {
        schools: {
          total: totalSchools,
          active: activeSchools,
          suspended: totalSchools - activeSchools,
        },
        users: {
          activeStudents: totalStudents,
          activeTeachers: totalTeachers,
          totalStakeholders: totalStudents + totalTeachers,
        },
        financials: {
          totalInvoices,
          paidInvoices: totalPaidInvoices,
          collectionRatePercentage: totalInvoices > 0 ? Math.round((totalPaidInvoices / totalInvoices) * 100) : 0,
          totalRevenueCollected: revenueAggregation._sum.amountPaid || 0,
        },
        subscriptions: {
          breakdown: subscriptions.map(s => ({ status: s.status, count: s._count.id })),
        },
        recentRegistrations,
      },
    });
  } catch (error: any) {
    console.error("Super Admin Metrics Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch platform metrics" });
  }
});

// =====================================
// MODULAR SAAS ENTITLEMENTS (SUPER ADMIN)
// =====================================

// GET /api/v1/saas/modules/registry — Central Module Registry
router.get("/modules/registry", authenticate, requireRole("SUPER_ADMIN"), async (_req, res) => {
  try {
    const modules = ModuleRegistryService.getAllModules();
    res.json({ success: true, data: modules });
  } catch (error: any) {
    console.error("Fetch module registry error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch module registry" });
  }
});

// GET /api/v1/saas/schools/:id/modules — School module entitlements
router.get("/schools/:id/modules", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const schoolId = req.params.id as string;
    const entitlements = await ModuleRegistryService.getSchoolEntitlements(schoolId);
    const registry = ModuleRegistryService.getAllModules();
    res.json({
      success: true,
      data: {
        schoolId,
        modules: entitlements,
        registry,
      },
    });
  } catch (error: any) {
    console.error("Fetch school modules error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch school modules" });
  }
});

// PUT /api/v1/saas/schools/:id/modules — Update school module entitlement
router.put("/schools/:id/modules", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const schoolId = req.params.id as string;
    const { modules, moduleId, enabled } = req.body;

    if (modules && typeof modules === "object") {
      for (const [modId, isEnabled] of Object.entries(modules)) {
        await ModuleRegistryService.setSchoolEntitlement(schoolId, modId, Boolean(isEnabled));
      }
    } else if (moduleId !== undefined && enabled !== undefined) {
      await ModuleRegistryService.setSchoolEntitlement(schoolId, moduleId, Boolean(enabled));
    } else {
      res.status(400).json({ success: false, error: "Invalid payload: provide 'modules' object or 'moduleId' and 'enabled'" });
      return;
    }

    const updated = await ModuleRegistryService.getSchoolEntitlements(schoolId);
    res.json({
      success: true,
      message: "School module entitlements updated successfully",
      data: {
        schoolId,
        modules: updated,
      },
    });
  } catch (error: any) {
    console.error("Update school modules error:", error);
    res.status(400).json({ success: false, error: error.message || "Failed to update school modules" });
  }
});

export default router;
