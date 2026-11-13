/**
 * ssvm-backend/src/middleware/moduleGuard.ts
 * Reusable authorization guard for School-Specific Modular SaaS Entitlements.
 *
 * Rejects direct API requests to disabled or unentitled modules with HTTP 403.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ModuleRegistryService } from '../services/module-registry.service';
import { Role } from '@prisma/client';

export const requireModule = (moduleId: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Resolve schoolId strictly:
      // Authenticated school users MUST use their assigned schoolId
      let schoolId = req.user?.schoolId;

      // Only Super Admin without assigned tenant, or machine device auth, may specify tenant context
      if (!schoolId) {
        if (req.user?.role === Role.SUPER_ADMIN) {
          schoolId =
            (req.headers['x-tenant-id'] as string) ||
            (req.headers['x-school-id'] as string) ||
            (req.params as any)?.id ||
            (req.params as any)?.schoolId;
        } else if ((req as any).deviceAuth?.schoolId) {
          schoolId = (req as any).deviceAuth.schoolId;
        }
      }

      // Super Admin accessing global platform route without target school
      if (req.user?.role === Role.SUPER_ADMIN && !schoolId) {
        return next();
      }

      if (!schoolId) {
        res.status(400).json({
          success: false,
          error: 'School Context Required',
          message: `School tenant context required to access module '${moduleId}'`,
        });
        return;
      }

      // 2. Query entitlement status (strictly fail-closed)
      const isEnabled = await ModuleRegistryService.isModuleEnabled(schoolId, moduleId);

      if (!isEnabled) {
        res.status(403).json({
          success: false,
          error: 'Module Disabled',
          code: 'MODULE_DISABLED',
          module: moduleId,
          message: `The ${moduleId} module is not enabled for your school. Contact the administrator to upgrade your subscription.`,
        });
        return;
      }

      next();
    } catch (err: any) {
      next(err);
    }
  };
};

