import { Router } from 'express';
import prisma from '../../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth';
import { FeatureService } from '../../services/feature.service';
import { logSecurityEvent } from '../../lib/audit';

const router = Router();

// Require SUPER_ADMIN or ERP_ADMIN
router.use(authenticate);

// ─── SETTINGS MANAGEMENT ─── //

router.get('/settings', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId as string;
    
    // Fetch or create default
    let settings = await prisma.schoolSettings.findUnique({
      where: { schoolId }
    });

    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: { schoolId }
      });
    }

    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/settings', requireRole('SUPER_ADMIN', 'ERP_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId as string;
    const { timezone, dateFormat, currency, academicYear, language, academicYearFormat, attendanceMethod, gradingSystem } = req.body;

    const settings = await prisma.schoolSettings.upsert({
      where: { schoolId },
      update: { timezone, dateFormat, currency, academicYear, language, academicYearFormat, attendanceMethod, gradingSystem },
      create: { schoolId, timezone, dateFormat, currency, academicYear, language, academicYearFormat, attendanceMethod, gradingSystem }
    });

    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── BRANDING MANAGEMENT ─── //

router.get('/branding', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId as string;
    
    let branding = await prisma.brandSettings.findUnique({
      where: { schoolId }
    });

    if (!branding) {
      branding = await prisma.brandSettings.create({
        data: { schoolId }
      });
    }

    res.json({ success: true, data: branding });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/branding', requireRole('SUPER_ADMIN', 'ERP_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId as string;
    const { primaryColor, secondaryColor, accentColor, logoUrl, faviconUrl, customDomain, loginBannerUrl, websiteUrl, emailFooter, emailDomain, senderName, replyTo } = req.body;

    const branding = await prisma.brandSettings.upsert({
      where: { schoolId },
      update: { primaryColor, secondaryColor, accentColor, logoUrl, faviconUrl, customDomain, loginBannerUrl, websiteUrl, emailFooter, emailDomain, senderName, replyTo },
      create: { schoolId, primaryColor, secondaryColor, accentColor, logoUrl, faviconUrl, customDomain, loginBannerUrl, websiteUrl, emailFooter, emailDomain, senderName, replyTo }
    });

    await logSecurityEvent({
      userId: req.user!.id,
      eventType: "BRANDING_UPDATED",
      severity: "LOW",
      ipAddress: (req.ip as string) || "Unknown",
      metadata: { schoolId }
    });

    res.json({ success: true, data: branding });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── FEATURES MANAGEMENT ─── //

router.get('/features', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId as string;
    const features = await FeatureService.getSchoolFeatures(schoolId);
    
    res.json({ success: true, data: features });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/features/toggle', requireRole('SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    // Only SUPER_ADMIN can toggle SaaS features on/off for a school, or maybe we allow ERP_ADMIN in higher tiers?
    // Usually features are packaged into plans controlled by Super Admins.
    const schoolId = req.user!.schoolId as string;
    const { featureCode, isEnabled } = req.body;

    if (!featureCode || isEnabled === undefined) {
      return res.status(400).json({ success: false, error: 'featureCode and isEnabled are required' });
    }

    if (isEnabled) {
      await FeatureService.enableFeatureForSchool(schoolId, featureCode);
    } else {
      await FeatureService.disableFeatureForSchool(schoolId, featureCode);
    }

    await logSecurityEvent({
      userId: req.user!.id,
      eventType: "FEATURE_TOGGLED",
      severity: "HIGH",
      ipAddress: (req.ip as string) || "Unknown",
      metadata: { featureCode, isEnabled, schoolId }
    });

    res.json({ success: true, message: `Feature ${featureCode} has been ${isEnabled ? 'enabled' : 'disabled'}.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
