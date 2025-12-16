import { buildApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { startRetryJob, stopRetryJob } from './jobs/retry.job.js'

async function main() {
  const app = await buildApp()

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal')

    stopRetryJob()

    await app.close()
    await prisma.$disconnect()

    logger.info('Graceful shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  try {
    await prisma.$connect()
    logger.info('Database connected')

    startRetryJob()

    await app.listen({ port: env.PORT, host: env.HOST })
    logger.info({ port: env.PORT, host: env.HOST }, 'Server started')
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    await prisma.$disconnect()
    process.exit(1)
  }
}

main().catch((error) => {
  logger.error({ error }, 'Unhandled error in main')
  process.exit(1)
})
