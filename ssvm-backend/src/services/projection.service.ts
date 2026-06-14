import { PrismaClient, SystemDomainEventType, DomainEvent } from '@prisma/client';
import logger from '../lib/logger';

const prisma = new PrismaClient();

export class ProjectionService {
  /**
   * CQRS Projection Application
   * Takes an immutable Domain Event and updates the heavily-denormalized Read Models.
   */
  static async applyEventToProjections(event: DomainEvent) {
    try {
      switch (event.eventType) {
        case SystemDomainEventType.PAYMENT_POSTED:
          await this.handlePaymentPosted(event);
          break;
        // Extensible for STUDENT_ENROLLED, LEAVE_APPROVED, etc.
      }
    } catch (error) {
      logger.error({ err: error }, `[CQRS] Failed to apply event ${event.id} to projections`);
      throw error;
    }
  }

  private static async handlePaymentPosted(event: DomainEvent) {
    if (!event.schoolId) return;

    const payload = event.payload as any;
    
    // For Phase 6 MVP, extract the amount. 
    // In Ledger contexts, look at the Revenue Credit entry.
    let amount = 0;
    if (payload.entries && Array.isArray(payload.entries)) {
      const revEntry = payload.entries.find((e: any) => Number(e.creditAmount) > 0);
      if (revEntry) amount = Number(revEntry.creditAmount);
    } else if (payload.amount) {
      amount = Number(payload.amount);
      console.log(`[Projection Engine] Rebuilding daily revenue projection for ${event.schoolId} on ${event.occurredAt}`);
    }

    if (amount <= 0) return;

    // 1. Update Daily Revenue Projection (High-speed dashboard queries)
    const startOfDay = new Date(event.occurredAt);
    startOfDay.setHours(0,0,0,0);

    await prisma.dailyRevenueProjection.upsert({
      where: { schoolId_date: { schoolId: event.schoolId, date: startOfDay } },
      update: {
        totalCollected: { increment: amount },
        netRevenue: { increment: amount },
        lastEventId: event.id
      },
      create: {
        schoolId: event.schoolId,
        date: startOfDay,
        totalCollected: amount,
        netRevenue: amount,
        lastEventId: event.id,
        updatedAt: new Date()
      }
    });

    // 2. Update Student Financial Projection (High-speed student profile queries)
    // Needs to derive studentId either from the top level payload or metadata
    const studentId = payload.studentId || payload.metadata?.studentId;
    if (studentId) {
      await prisma.studentFinancialProjection.upsert({
        where: { studentId },
        update: {
          totalPaid: { increment: amount },
          outstanding: { decrement: amount },
          lastPaymentDate: new Date(event.occurredAt),
          lastEventId: event.id,
          updatedAt: new Date()
        },
        create: {
          schoolId: event.schoolId,
          studentId: studentId,
          totalPaid: amount,
          outstanding: -amount, // Simple assumption for demo
          lastPaymentDate: new Date(event.occurredAt),
          lastEventId: event.id,
          updatedAt: new Date()
        }
      });
    }
  }
}
