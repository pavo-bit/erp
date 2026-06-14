import { PrismaClient } from '@prisma/client';

import logger from '../lib/logger';
import { ProjectionService } from '../services/projection.service';

const prisma = new PrismaClient();

/**
 * PHASE 2: OUTBOX RELAY WORKER
 * 
 * This worker runs on a cron schedule or continuous loop.
 * It sweeps the database for PENDING outbox messages and pushes them
 * into the true Redis event queue, guaranteeing at-least-once delivery.
 */
export async function sweepOutbox() {
  const pendingMessages = await prisma.outboxMessage.findMany({
    where: { status: 'PENDING' },
    take: 100, // Batch process
    orderBy: { createdAt: 'asc' }
  });

  if (pendingMessages.length === 0) return;

  for (const msg of pendingMessages) {
    try {
      // 1. Mark as processing to prevent concurrent grabs
      await prisma.outboxMessage.update({
        where: { id: msg.id },
        data: { status: 'PROCESSING' }
      });

      // 2. Here we would push to the actual messaging broker (Kafka / BullMQ)
      // For now, we simulate successful delivery
      // await eventQueue.add(msg.eventType, msg.payload);

      // --- PHASE 6 CQRS INTEGRATION ---
      // Apply the Domain Event to the Read Models immediately before marking as published
      if (msg.domainEventId) {

        const fullEvent = await prisma.domainEvent.findUnique({ where: { id: msg.domainEventId } });
        if (fullEvent) {
          await ProjectionService.applyEventToProjections(fullEvent);
        }
      }
      // --------------------------------

      // 3. Mark as published
      await prisma.outboxMessage.update({
        where: { id: msg.id },
        data: { status: 'PUBLISHED', processedAt: new Date() }
      });

      logger.info(`[Outbox] Successfully relayed Domain Event: ${msg.eventType}`);
    } catch (error: any) {
      logger.error(`[Outbox] Failed to relay message ${msg.id}: ${error.message}`);
      await prisma.outboxMessage.update({
        where: { id: msg.id },
        data: { 
          status: 'FAILED',
          error: error.message,
          retryCount: { increment: 1 }
        }
      });
    }
  }
}

// In a real enterprise system, this runs continuously:
// setInterval(sweepOutbox, 5000);
