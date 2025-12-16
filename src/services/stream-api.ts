import { v4 as uuidv4 } from 'uuid'
import { env } from '../config/env.js'
import { APP_NAME, APP_VERSION } from '../config/constants.js'
import { logger } from '../lib/logger.js'
import type { StreamEventInput } from '../schemas/events.js'

interface PublishResult {
  success: boolean
  eventId?: string
  error?: string
}

export class StreamApiClient {
  private readonly baseUrl: string
  private readonly token: string

  constructor() {
    this.baseUrl = env.GS_STREAM_API_URL
    this.token = env.GS_STREAM_API_TOKEN
  }

  async publishEvent(input: StreamEventInput): Promise<PublishResult> {
    const eventId = uuidv4()
    const timestamp = new Date().toISOString()

    // Format accountId as UUID-like string for gs-stream-api compatibility
    const accountIdUuid = `00000000-0000-0000-0000-${String(input.accountId).padStart(12, '0')}`

    const event = {
      eventId,
      eventType: input.eventType,
      timestamp,
      source: {
        application: APP_NAME,
        version: APP_VERSION,
        environment: env.NODE_ENV,
      },
      actor: {
        userId: '00000000-0000-0000-0000-000000000000',
        accountId: accountIdUuid,
        role: 'system',
      },
      scope: {
        accountId: accountIdUuid,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
      payload: input.payload,
      metadata: {},
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(event),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(
          { status: response.status, error: errorText, eventId },
          'Failed to publish event to stream API'
        )
        return {
          success: false,
          eventId,
          error: `HTTP ${String(response.status)}: ${errorText}`,
        }
      }

      logger.debug({ eventId, eventType: event.eventType }, 'Event published successfully')
      return { success: true, eventId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ error: errorMessage, eventId }, 'Error publishing event to stream API')
      return {
        success: false,
        eventId,
        error: errorMessage,
      }
    }
  }
}

export const streamApiClient = new StreamApiClient()
