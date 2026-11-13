import prisma from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';



// Extend Express Request interface to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Middleware to extract the tenant (schoolId) from headers or authenticated user.
 * This ensures that every request is strictly bound to a tenant.
 */
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Try to get tenantId from custom header (e.g., x-tenant-id)
    const headerTenantId = req.header('x-tenant-id');

    // 2. Fallback to the authenticated user's schoolId (if auth middleware runs first)
    // @ts-ignore - Assuming req.user is set by auth middleware
    const userTenantId = req.user?.schoolId;

    const tenantId = headerTenantId || userTenantId;

    // Optional: Allow Super Admins to bypass tenant injection or explicitly provide one
    // @ts-ignore
    if (req.user?.role === 'SUPER_ADMIN') {
        req.tenantId = headerTenantId; // Super Admins can query without tenantId if header is missing
        return next();
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required. Please provide x-tenant-id header.',
      });
    }

    req.tenantId = tenantId;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if the tenant's subscription is active.
 * Stops requests if the SaaS subscription has expired or is suspended.
 */
export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return next(); // Skip if no tenant is set
    }

    const subscription = await prisma.subscription.findUnique({
      where: { schoolId: tenantId },
      select: { status: true, endDate: true },
    });

    if (!subscription) {
      return res.status(403).json({ error: "No active subscription found for this school" });
    }

    if (subscription.status !== "ACTIVE" || new Date(subscription.endDate) < new Date()) {
      return res.status(402).json({ 
        error: "Subscription Expired", 
        message: "Your SaaS subscription has expired. Please renew to continue using the platform." 
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
