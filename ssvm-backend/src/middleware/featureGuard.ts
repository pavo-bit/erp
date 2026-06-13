import { Request, Response, NextFunction } from 'express';
import { FeatureService } from '../services/feature.service';
import { AuthRequest } from './auth';

/**
 * Middleware to protect routes based on feature flags.
 */
export const requireFeature = (featureCode: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      // Depending on the route, schoolId might be in the user object or the tenant middleware
      const schoolId = authReq.user?.schoolId || req.headers['x-tenant-id'] as string;

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
