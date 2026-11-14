import { Request, Response, NextFunction } from 'express';
import { FeatureService } from '../services/feature.service';
import { AuthRequest } from './auth';
import prisma from '../lib/prisma';

/**
 * Middleware to protect routes based on feature flags.
 */
export const requireFeature = (featureCode: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const schoolId = authReq.user?.schoolId || (authReq.user?.role === 'SUPER_ADMIN' ? (req.params as any)?.schoolId : undefined);

      if (!schoolId) {
        res.status(400).json({ success: false, error: 'School ID is required for feature validation' });
        return;
      }

      const isEnabled = await FeatureService.isFeatureEnabled(schoolId, featureCode);

      if (!isEnabled) {
        res.status(403).json({
          success: false,
          error: 'Feature Disabled',
          message: `The ${featureCode} feature is not enabled for your school.`
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to enforce tenant resource quotas (student limits, teacher limits).
 */
export const requireQuota = (resource: "STUDENT" | "TEACHER") => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const schoolId = authReq.user?.schoolId || (authReq.user?.role === 'SUPER_ADMIN' ? (req.params as any)?.schoolId : undefined);

      if (!schoolId) {
        res.status(400).json({ success: false, error: 'School ID is required for quota validation' });
        return;
      }

      // Bypass for SUPER_ADMIN
      if (authReq.user?.role === "SUPER_ADMIN") {
        next();
        return;
      }

      const subscription = await prisma.subscription.findUnique({
        where: { schoolId },
        include: { planConfig: true },
      });

      if (subscription?.planConfig?.features) {
        try {
          const config = JSON.parse(subscription.planConfig.features);
          if (resource === "STUDENT" && typeof config.maxStudents === "number") {
            const count = await prisma.student.count({ where: { schoolId, isActive: true } });
            if (count >= config.maxStudents) {
              res.status(403).json({
                success: false,
                error: 'Quota Exceeded',
                message: `Active student limit (${config.maxStudents}) reached for current subscription plan. Please upgrade to enroll more students.`
              });
              return;
            }
          }
        } catch {
          // Plain string array or unparseable, continue
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

