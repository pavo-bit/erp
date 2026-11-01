import prisma from '../lib/prisma';



export class PolicyEngineService {
  /**
   * Evaluate a specific policy version against a data context
   */
  static async evaluatePolicy(policyVersionId: string, entityId: string, context: Record<string, any>): Promise<boolean> {
    const version = await prisma.policyVersion.findUnique({ where: { id: policyVersionId } });
    if (!version) throw new Error("Policy version not found");

    // 1. Evaluate Rule Expression (Using a simulated generic evaluator for Phase 5 PoC)
    // In production, this runs: return jsonLogic.apply(version.ruleExpression, context);
    // For now, if the context has amount > 50000, we trigger an approval requirement (false = needs approval).
    let result = true; 
    
    const rules = version.ruleExpression as Record<string, any>;
    if (rules && rules.autoApproveThreshold && context.amount) {
       result = context.amount <= rules.autoApproveThreshold;
    }

    // 2. Log the Evaluation immutably for Forensic Auditing
    await prisma.policyEvaluationLog.create({
      data: {
        policyVersionId: version.id,
        entityId,
        contextSnapshot: context,
        result
      }
    });

    return result;
  }

  /**
   * Evaluate the latest active version of a policy by name
   */
  static async evaluatePolicyByName(schoolId: string, policyName: string, entityId: string, context: Record<string, any>): Promise<boolean> {
    const policy = await prisma.policyDefinition.findFirst({
      where: {
        schoolId,
        name: policyName,
        isActive: true
      },
      include: {
        PolicyVersion: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!policy || policy.PolicyVersion.length === 0) {
      throw new Error(`Active Policy Definition not found for ${policyName}`);
    }

    const logicRules = policy.PolicyVersion[0].ruleExpression as any;
    return this.evaluatePolicy(policy.PolicyVersion[0].id, entityId, context);
  }
}
