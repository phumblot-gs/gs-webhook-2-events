import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'
import { streamApiClient } from './stream-api.js'
import { env } from '../config/env.js'
import { EVENT_TYPE_TO_NATS } from '../config/constants.js'
import type { EventType } from '../config/constants.js'

interface FailedEventsQuery {
  page: number
  limit: number
  accountId?: number | undefined
  eventType?: EventType | undefined
}

export class FailedEventsService {
  async findAll(query: FailedEventsQuery) {
    const skip = (query.page - 1) * query.limit

    const where = {
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.eventType && { eventType: query.eventType }),
    }

    const [events, total] = await Promise.all([
      prisma.failedEvent.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              accountName: true,
            },
          },
        },
      }),
      prisma.failedEvent.count({ where }),
    ])

    return {
      data: events,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  async replayEvents(ids?: string[], all?: boolean): Promise<{ replayed: number; failed: number }> {
    let events

    if (all) {
      events = await prisma.failedEvent.findMany({
        where: {
          retryCount: { lt: env.RETRY_JOB_MAX_RETRIES },
        },
      })
    } else if (ids && ids.length > 0) {
      events = await prisma.failedEvent.findMany({
        where: {
          id: { in: ids },
        },
      })
    } else {
      return { replayed: 0, failed: 0 }
    }

    let replayed = 0
    let failed = 0

    for (const event of events) {
      const success = await this.replayEvent(event)
      if (success) {
        replayed++
      } else {
        failed++
      }
    }

    return { replayed, failed }
  }

  async replayPendingEvents(): Promise<{ replayed: number; failed: number }> {
    const now = new Date()

    const events = await prisma.failedEvent.findMany({
      where: {
        nextRetry: { lte: now },
        retryCount: { lt: env.RETRY_JOB_MAX_RETRIES },
      },
      take: 100,
      orderBy: { nextRetry: 'asc' },
    })

    if (events.length === 0) {
      return { replayed: 0, failed: 0 }
    }

    logger.info({ count: events.length }, 'Processing pending failed events')

    let replayed = 0
    let failed = 0

    for (const event of events) {
      const success = await this.replayEvent(event)
      if (success) {
        replayed++
      } else {
        failed++
      }
    }

    logger.info({ replayed, failed }, 'Finished processing pending failed events')
    return { replayed, failed }
  }

  private async replayEvent(event: {
    id: string
    accountId: number
    eventType: string
    payload: unknown
    retryCount: number
  }): Promise<boolean> {
    const payload = event.payload as {
      resourceId: string
      resourceType: string
      itemData: Record<string, unknown>
      originalTopic: string
    }

    const eventTypeKey = event.eventType as EventType
    if (!(eventTypeKey in EVENT_TYPE_TO_NATS)) {
      logger.error({ eventType: event.eventType }, 'Unknown event type for replay')
      await prisma.failedEvent.delete({ where: { id: event.id } })
      return false
    }
    const natsEventType = EVENT_TYPE_TO_NATS[eventTypeKey]

    const itemData = payload.itemData

    const result = await streamApiClient.publishEvent({
      accountId: event.accountId,
      eventType: natsEventType,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      payload: {
        ...itemData,
        originalTopic: payload.originalTopic,
        originalType: payload.resourceType,
        isReplay: true,
      },
    })

    if (result.success) {
      await prisma.failedEvent.delete({ where: { id: event.id } })
      logger.debug({ eventId: event.id }, 'Failed event replayed successfully')
      return true
    } else {
      const nextRetryDelay = this.calculateNextRetryDelay(event.retryCount + 1)

      await prisma.failedEvent.update({
        where: { id: event.id },
        data: {
          retryCount: event.retryCount + 1,
          error: result.error ?? 'Unknown error',
          nextRetry: new Date(Date.now() + nextRetryDelay),
        },
      })

      logger.warn(
        { eventId: event.id, retryCount: event.retryCount + 1 },
        'Failed to replay event, scheduled for retry'
      )
      return false
    }
  }

  private calculateNextRetryDelay(retryCount: number): number {
    const baseDelay = 60000
    const maxDelay = 3600000
    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay)
    return delay
  }

  async deleteEvent(id: string) {
    return prisma.failedEvent.delete({ where: { id } })
  }

  async getStats() {
    const [total, pending, maxRetries] = await Promise.all([
      prisma.failedEvent.count(),
      prisma.failedEvent.count({
        where: {
          retryCount: { lt: env.RETRY_JOB_MAX_RETRIES },
        },
      }),
      prisma.failedEvent.count({
        where: {
          retryCount: { gte: env.RETRY_JOB_MAX_RETRIES },
        },
      }),
    ])

    return { total, pending, maxRetries }
  }
}

export const failedEventsService = new FailedEventsService()
