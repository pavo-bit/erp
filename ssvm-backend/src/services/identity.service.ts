import { PrismaClient, Role } from '@prisma/client';
import crypto from 'crypto';
import { hashPassword } from '../middleware/auth';

const prisma = new PrismaClient();

export class IdentityService {
  /**
   * Phase 14: Handle an incoming SSO Login (e.g. from Azure AD or Google Workspace)
   * This takes the verified payload from the Identity Provider and maps it
   * to a local user session.
   */
  static async handleSSOLogin(
    providerName: string,
    externalSubject: string,
    email: string,
    name: string
  ) {
    // 1. Find the Identity Provider configuration
    const provider = await prisma.identityProvider.findFirst({
      where: { name: providerName, isActive: true }
    });

    if (!provider) {
      throw new Error(`Identity Provider ${providerName} is not configured or active.`);
    }

    // 2. Check if the user has already linked this federated identity
    let federatedUser = await prisma.federatedUser.findUnique({
      where: {
        providerId_externalSubject: {
          providerId: provider.id,
          externalSubject
        }
      },
      include: { users: true }
    });

    // 3. If they exist, update last login and return the local user profile
    if (federatedUser) {
      await prisma.federatedUser.update({
        where: { id: federatedUser.id },
        data: { lastLoginAt: new Date() }
      });
      return federatedUser.users;
    }

    // 4. If they don't exist as a federated user, look for an existing local user with the same email
    let localUser = await prisma.user.findUnique({ where: { email } });

    // 5. If no local user exists, perform Just-In-Time (JIT) Provisioning
    if (!localUser) {
      // Generate a strong random password since they will rely entirely on SSO
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await hashPassword(randomPassword);
      
      localUser = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: hashedPassword, 
          role: Role.STUDENT, // Default fallback role, should be mapped via Claims
          isActive: true
        }
      });
    }

    // 6. Link the External Identity to the Local User
    await prisma.federatedUser.create({
      data: {
        userId: localUser.id,
        providerId: provider.id,
        externalSubject,
        email,
        lastLoginAt: new Date()
      }
    });

    return localUser;
  }
}
