import { PrismaClient, TenantState } from '@prisma/client';

const prisma = new PrismaClient();

export class TenantLifecycleService {
  /**
   * Phase 7: Provision a New School Tenant
   * Automates the setup of the Ledger Chart of Accounts,
   * Default Workflows, and Default Policies so the school
   * is instantly ready to operate on the Enterprise platform.
   */
  static async provisionTenant(schoolId: string, adminUserId: string) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new Error("School not found");

    if (school.tenantState !== TenantState.PROVISIONING) {
      throw new Error(`School is currently in state ${school.tenantState}, cannot provision.`);
    }

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Generate Default Ledger Chart of Accounts
        const defaultAccounts = [
          { code: '1010-BANK', name: 'Main Bank Account', type: 'BANK', category: 'ASSET' },
          { code: '1200-REC', name: 'Student Fee Receivables', type: 'RECEIVABLE', category: 'ASSET' },
          { code: '1300-ICR', name: 'Inter-Company Receivables', type: 'RECEIVABLE', category: 'ASSET' },
          { code: '2100-DEF', name: 'Deferred Revenue', type: 'PAYABLE', category: 'LIABILITY' },
          { code: '2300-ICP', name: 'Inter-Company Payables', type: 'PAYABLE', category: 'LIABILITY' },
          { code: '4000-TUIT', name: 'Tuition Revenue', type: 'REVENUE', category: 'REVENUE' },
          { code: '5000-SAL', name: 'Salary Expense', type: 'EXPENSE', category: 'EXPENSE' }
        ];

        for (const acc of defaultAccounts) {
          await tx.ledgerAccount.upsert({
            where: { schoolId_code: { schoolId, code: acc.code } },
            update: {},
            create: {
              schoolId,
              code: acc.code,
              name: acc.name,
              type: acc.type as any,
              category: acc.category as any,
              isActive: true
            }
          });
        }

        // 2. Generate Default Workflow Definitions (e.g. Leave Approval)
        await tx.workflowDefinition.create({
          data: {
            id: crypto.randomUUID(),
            schoolId,
            name: 'Standard Leave Approval',
            entityType: 'LEAVE',
            isActive: true,
            version: 1,
            WorkflowNode: {
              create: [
                { name: 'Start', type: 'START' },
                { name: 'HOD Approval', type: 'APPROVAL' },
                { name: 'Principal Approval', type: 'APPROVAL' },
                { name: 'End', type: 'END' }
              ]
            }
          }
        });

        // 3. Mark Tenant as Active
        await tx.school.update({
          where: { id: schoolId },
          data: {
            tenantState: TenantState.ACTIVE,
            onboardingDone: true
          }
        });
      });

      return { success: true, message: "Tenant successfully provisioned with Enterprise defaults." };
    } catch (error) {
      // 4. If provisioning fails, set state to SUSPENDED to lock out access
      await prisma.school.update({
        where: { id: schoolId },
        data: { tenantState: TenantState.SUSPENDED }
      });
      throw error;
    }
  }

  /**
   * Suspend a Tenant (e.g., due to non-payment or API violation)
   */
  static async suspendTenant(schoolId: string) {
    return await prisma.school.update({
      where: { id: schoolId },
      data: { tenantState: TenantState.SUSPENDED }
    });
  }
}
