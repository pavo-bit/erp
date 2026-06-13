import prisma from '../lib/prisma';
import logger from '../lib/logger';

export class FeatureService {
  /**
   * Initializes default features in the database.
   * This can be called during system startup or tenant onboarding.
   */
  static async initializeDefaultFeatures() {
    const defaultFeatures = [
      { code: 'MESSAGING', name: 'Messaging System', description: 'Internal communication via threads', category: 'COMMUNICATION', defaultEnabled: true },
      { code: 'LIBRARY', name: 'Library Management', description: 'Manage books and issues', category: 'ACADEMICS', defaultEnabled: false },
      { code: 'HOSTEL', name: 'Hostel Management', description: 'Manage dorms and allocations', category: 'OPERATIONS', defaultEnabled: false },
      { code: 'TRANSPORT', name: 'Transport Management', description: 'Manage routes and fleets', category: 'OPERATIONS', defaultEnabled: false },
      { code: 'INVENTORY', name: 'Inventory Management', description: 'Manage assets and stocks', category: 'OPERATIONS', defaultEnabled: false },
    ];

    try {
      for (const feature of defaultFeatures) {
        await prisma.featureFlag.upsert({
          where: { code: feature.code },
          update: {
            name: feature.name,
            description: feature.description,
            category: feature.category,
            defaultEnabled: feature.defaultEnabled
          },
          create: feature
        });
      }
      logger.info('Default feature flags initialized successfully.');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize feature flags');
    }
  }

  /**
   * Enables a feature for a specific school.
   */
  static async enableFeatureForSchool(schoolId: string, featureCode: string) {
    const feature = await prisma.featureFlag.findUnique({ where: { code: featureCode } });
    if (!feature) throw new Error(`Feature ${featureCode} does not exist`);

    return prisma.schoolFeature.upsert({
      where: {
        schoolId_featureId: {
          schoolId,
          featureId: feature.id
        }
      },
      update: { isEnabled: true },
      create: {
        schoolId,
        featureId: feature.id,
        isEnabled: true
      }
    });
  }

  /**
   * Disables a feature for a specific school.
   */
  static async disableFeatureForSchool(schoolId: string, featureCode: string) {
    const feature = await prisma.featureFlag.findUnique({ where: { code: featureCode } });
    if (!feature) throw new Error(`Feature ${featureCode} does not exist`);

    return prisma.schoolFeature.update({
      where: {
        schoolId_featureId: {
          schoolId,
          featureId: feature.id
        }
      },
      data: { isEnabled: false }
    });
  }

  /**
   * Checks if a specific feature is enabled for a school.
   */
  static async isFeatureEnabled(schoolId: string, featureCode: string): Promise<boolean> {
    const feature = await prisma.featureFlag.findUnique({ where: { code: featureCode } });
    if (!feature || !feature.isActive) return false;

    const schoolFeature = await prisma.schoolFeature.findUnique({
      where: {
        schoolId_featureId: {
          schoolId,
          featureId: feature.id
        }
      }
    });

    if (schoolFeature) {
      return schoolFeature.isEnabled;
    }

    return feature.defaultEnabled; // If no explicit override, fallback to default status
  }

  /**
   * Gets all available features and their status for a school.
   */
  static async getSchoolFeatures(schoolId: string) {
    const allFeatures = await prisma.featureFlag.findMany({ where: { isActive: true } });
    const schoolFeatures = await prisma.schoolFeature.findMany({
      where: { schoolId },
      include: { feature: true }
    });

    const overrides = new Map(schoolFeatures.map((sf: any) => [sf.feature.code, sf.isEnabled]));

    return allFeatures.map((feature: any) => ({
      code: feature.code,
      name: feature.name,
      description: feature.description,
      isEnabled: overrides.has(feature.code) ? overrides.get(feature.code) : feature.isDefault
    }));
  }
}
