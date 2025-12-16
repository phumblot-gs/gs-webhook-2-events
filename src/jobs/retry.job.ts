import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { failedEventsService } from '../services/failed-events.service.js'

let intervalId: NodeJS.Timeout | null = null

export function startRetryJob() {
  if (intervalId) {
    logger.warn('Retry job already running')
    return
  }

  logger.info(
    { intervalMs: env.RETRY_JOB_INTERVAL_MS },
    'Starting retry job'
  )

  intervalId = setInterval(() => {
    void (async () => {
      try {
        const result = await failedEventsService.replayPendingEvents()
        if (result.replayed > 0 || result.failed > 0) {
          logger.info(result, 'Retry job completed')
        }
      } catch (error) {
        logger.error({ error }, 'Retry job failed')
      }
    })()
  }, env.RETRY_JOB_INTERVAL_MS)

  void runImmediately()
}

export function stopRetryJob() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    logger.info('Retry job stopped')
  }
}

async function runImmediately() {
  try {
    const result = await failedEventsService.replayPendingEvents()
    if (result.replayed > 0 || result.failed > 0) {
      logger.info(result, 'Initial retry job completed')
    }
  } catch (error) {
    logger.error({ error }, 'Initial retry job failed')
  }
}
