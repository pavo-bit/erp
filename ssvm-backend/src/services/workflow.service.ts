import { PrismaClient, WorkflowStatus, TaskStatus, WorkflowNodeType } from '@prisma/client';
import { PolicyEngineService } from './policy.service';

const prisma = new PrismaClient();

export class WorkflowService {
  /**
   * Start a new workflow instance for a specific entity.
   */
  static async startWorkflow(workflowId: string, entityType: string, schoolId: string, entityId: string, startedBy: string) {
    const workflow = await prisma.workflowDefinition.findFirst({
      where: { entityType, schoolId, isActive: true },
      include: { WorkflowNode: true }
    });

    if (!workflow) throw new Error(`No active workflow found for ${entityType}`);

    const startNode = workflow.WorkflowNode.find(n => n.name === 'Start' || n.type === 'START');
    if (!startNode) throw new Error("Workflow is missing a START node");

    // Start a transaction to ensure integrity
    return await prisma.$transaction(async (tx) => {
      // 1. Create Instance
      const instance = await tx.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          entityId,
          startedBy,
          status: 'IN_PROGRESS'
        }
      });

      // 2. Trigger transition from START node
      await this._executeNodeTransition(tx, instance.id, startNode.id);

      return instance;
    });
  }

  /**
   * Internal transition engine. Evaluates routes and creates tasks.
   */
  private static async _executeNodeTransition(tx: any, instanceId: string, currentNodeId: string) {
    const instance = await tx.workflowInstance.findUnique({ where: { id: instanceId } });
    // Find outbound transitions from the current node
    const transitions = await tx.workflowTransition.findMany({
      where: { fromNodeId: currentNodeId },
      include: { toNode: true }
    });

    if (transitions.length === 0) {
      // Reached a dead end, likely an END node. Mark complete.
      await tx.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'APPROVED', completedAt: new Date() }
      });
      return;
    }

    for (const transition of transitions) {
      const nextNode = transition.toNode;

      // 1. Evaluate Condition (Phase 5 Policy-as-Code Engine Integration)
      // If transition.conditionExpr exists, evaluate it.
      let conditionMet = true;
      if (transition.conditionExpr) {
        // conditionExpr holds the policy name. We execute it against the current entity context.
        // Assuming we pass a generic context object. In production, we fetch the entity data here.
        try {
          const definition = await prisma.workflowDefinition.findUnique({
            where: { id: instance.workflowId },
          });
          if (!definition) throw new Error('Workflow Definition missing');
          conditionMet = await PolicyEngineService.evaluatePolicyByName(
            definition.schoolId, 
            transition.conditionExpr, 
            instanceId, 
            { amount: 5000 } // Mock context payload
          );
        } catch (err) {
          console.error("Policy evaluation failed", err);
          conditionMet = false; // Fail safe
        }
      }

      if (!conditionMet) continue;

      // 2. Process Next Node
      if (nextNode.type === 'APPROVAL') {
        // Create a Pending Task for the target role/user
        await tx.workflowTask.create({
          data: {
            instanceId,
            nodeId: nextNode.id,
            assignedRole: nextNode.roleRequired,
            status: 'PENDING'
          }
        });
      } else if (nextNode.type === 'ACTION') {
        // Execute automated action (webhook, email, state change)
        // e.g. ExecuteActionService.run(nextNode.actionPayload)
        
        // Immediately move to the next node since it's automated
        await this._executeNodeTransition(tx, instanceId, nextNode.id);
      } else if (nextNode.type === 'END') {
        await tx.workflowInstance.update({
          where: { id: instanceId },
          data: { status: 'APPROVED', completedAt: new Date() }
        });
      }
    }
  }

  /**
   * Approve an assigned task and progress the workflow
   */
  static async approveTask(taskId: string, userId: string, comments?: string) {
    return await prisma.$transaction(async (tx) => {
      const task = await tx.workflowTask.findUnique({
        where: { id: taskId },
        include: { WorkflowInstance: true, WorkflowNode: true }
      });

      if (!task || task.status !== 'PENDING') throw new Error("Task not available or already processed");
      if (task.WorkflowInstance.status !== 'IN_PROGRESS') throw new Error("Workflow is not in progress");

      // Mark task as approved
      await tx.workflowTask.update({
        where: { id: taskId },
        data: {
          status: 'APPROVED',
          actedBy: userId,
          actedAt: new Date(),
          comments
        }
      });

      // Move to next node in the graph
      await this._executeNodeTransition(tx, task.instanceId, task.nodeId);
      
      return task;
    });
  }

  /**
   * Reject a task, canceling the workflow
   */
  static async rejectTask(taskId: string, userId: string, comments?: string) {
    return await prisma.$transaction(async (tx) => {
      const task = await prisma.workflowTask.findUnique({
      where: { id: taskId },
      include: { WorkflowInstance: true }
    });

    if (!task) throw new Error("Task not found");
    if (task.status !== 'PENDING') throw new Error("Task is already completed or rejected");

    const instance = task.WorkflowInstance;
      await tx.workflowTask.update({
        where: { id: taskId },
        data: {
          status: 'REJECTED',
          actedBy: userId,
          actedAt: new Date(),
          comments
        }
      });

      // Reject the entire workflow instance
      await tx.workflowInstance.update({
        where: { id: task.instanceId },
        data: {
          status: 'REJECTED',
          completedAt: new Date()
        }
      });

      return task;
    });
  }
}
