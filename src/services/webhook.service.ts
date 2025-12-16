import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'
import { streamApiClient } from './stream-api.js'
import { clientService } from './client.service.js'
import { EVENT_TYPE_TO_NATS, GS_TOPIC_TO_EVENT_TYPE } from '../config/constants.js'
import type { EventType } from '../config/constants.js'
import type { WebhookPayload } from '../schemas/webhook.js'

interface ProcessResult {
  success: boolean
  processed: number
  failed: number
  errors: string[]
}

export class WebhookService {
  async processWebhook(accountId: number, payload: WebhookPayload): Promise<ProcessResult> {
    const eventType = GS_TOPIC_TO_EVENT_TYPE[payload.topic]

    if (!eventType) {
      logger.warn({ topic: payload.topic, accountId }, 'Unknown topic received')
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [`Unknown topic: ${payload.topic}`],
      }
    }

    const isEnabled = await clientService.isEventEnabled(accountId, eventType)
    if (!isEnabled) {
      logger.info({ accountId, eventType }, 'Event type disabled for client, skipping')
      return {
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
      }
    }

    const natsEventType = EVENT_TYPE_TO_NATS[eventType]
    const resourceType = payload.type
    const ids = payload.ids

    let processed = 0
    let failed = 0
    const errors: string[] = []

    for (const id of ids) {
      const resourceId = String(id)
      const itemData = payload.data?.[resourceId] ?? {}

      const result = await streamApiClient.publishEvent({
        accountId,
        eventType: natsEventType,
        resourceType,
        resourceId,
        payload: {
          ...itemData,
          originalTopic: payload.topic,
          originalType: payload.type,
        },
      })

      if (result.success) {
        processed++
      } else {
        failed++
        errors.push(`Failed to publish event for ${resourceType} ${resourceId}: ${result.error ?? 'Unknown error'}`)

        await this.saveFailedEvent(accountId, eventType, {
          resourceId,
          resourceType,
          itemData,
          originalPayload: payload,
          error: result.error ?? 'Unknown error',
        })
      }
    }

    logger.info(
      { accountId, eventType, processed, failed, total: ids.length },
      'Webhook processed'
    )

    return {
      success: failed === 0,
      processed,
      failed,
      errors,
    }
  }

  private async saveFailedEvent(
    accountId: number,
    eventType: EventType,
    data: {
      resourceId: string
      resourceType: string
      itemData: unknown
      originalPayload: WebhookPayload
      error: string
    }
  ) {
    try {
      const client = await clientService.findByAccountId(accountId)

      const itemDataJson: Record<string, unknown> = typeof data.itemData === 'object' && data.itemData !== null
        ? (JSON.parse(JSON.stringify(data.itemData)) as Record<string, unknown>)
        : {}

      await prisma.failedEvent.create({
        data: {
          clientId: client?.id ?? null,
          accountId,
          eventType,
          payload: {
            resourceId: data.resourceId,
            resourceType: data.resourceType,
            itemData: itemDataJson as Record<string, string | number | boolean | null>,
            originalTopic: data.originalPayload.topic,
          },
          error: data.error,
          retryCount: 0,
          nextRetry: new Date(Date.now() + 60000),
        },
      })
    } catch (error) {
      logger.error({ error, accountId, eventType }, 'Failed to save failed event')
    }
  }
}

export const webhookService = new WebhookService()
