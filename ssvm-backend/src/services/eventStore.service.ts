import { PrismaClient, Prisma, SystemDomainEventType } from '@prisma/client';

const prisma = new PrismaClient();

export interface PublishEventInput {
  schoolId?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: SystemDomainEventType;
  payload: any;
  publishedBy?: string;
  correlationId?: string;
}

export class EventStoreService {
  /**
   * Enterprise Domain Event Publisher with Transactional Outbox
   * 
   * This guarantees that if the business transaction succeeds,
   * the event is GUARANTEED to be published to the message broker eventually.
   * 
   * It takes a Prisma Transaction Client (`tx`) so it can be enlisted in the same DB transaction.
   */
  static async publishEvent(tx: Prisma.TransactionClient, input: PublishEventInput) {
    // 1. Create the Domain Event (Immutable history of what happened)
    const domainEvent = await tx.domainEvent.create({
      data: {
        id: crypto.randomUUID(),
        schoolId: input.schoolId,
        aggregateId: input.aggregateId,
        aggregateType: input.aggregateType,
        eventType: input.eventType,
        payload: input.payload as Prisma.InputJsonValue,
        publishedBy: input.publishedBy,
        correlationId: input.correlationId,
      }
    });

    // 2. Create the Outbox Message (For guaranteed delivery to Redis/BullMQ/Kafka)
    await tx.outboxMessage.create({
      data: {
        id: crypto.randomUUID(),
        domainEventId: domainEvent.id,
        eventType: domainEvent.eventType,
        payload: domainEvent.payload as Prisma.InputJsonValue,
        status: 'PENDING'
      }
    });

    return domainEvent;
  }
}
