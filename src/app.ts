import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { webhookRoutes } from './routes/webhook.routes.js'
import { adminRoutes } from './routes/admin.routes.js'
import { healthRoutes } from './routes/health.routes.js'
import { APP_NAME, APP_VERSION } from './config/constants.js'

export async function buildApp() {
  const fastify = Fastify({
    logger: false,
  })

  await fastify.register(cors, {
    origin: true,
    credentials: true,
  })

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  })

  await fastify.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.headers['x-forwarded-for']?.toString() ?? request.ip
    },
  })

  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: APP_NAME,
        description: 'Webhook receiver for Grand Shooting events, publishing to gs-stream-api',
        version: APP_VERSION,
      },
      servers: [
        {
          url: 'https://gs-webhook-2-events.grand-shooting.com',
          description: 'Production',
        },
        {
          url: 'https://gs-webhook-2-events-staging.grand-shooting.com',
          description: 'Staging',
        },
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Local development',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Webhook', description: 'Webhook receiver endpoints' },
        { name: 'Admin - Clients', description: 'Client management endpoints' },
        { name: 'Admin - Webhooks', description: 'Webhook configuration endpoints' },
        { name: 'Admin - Failed Events', description: 'Failed events management endpoints' },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header',
            description: 'Admin API key',
          },
        },
      },
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  })

  fastify.setErrorHandler((error, _request, reply) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error({ error: errorMessage, stack: errorStack }, 'Unhandled error')

    const hasValidation = typeof error === 'object' && error !== null && 'validation' in error
    if (hasValidation && (error as { validation: unknown }).validation) {
      return reply.status(400).send({
        error: 'Validation error',
        details: (error as { validation: unknown }).validation,
      })
    }

    return reply.status(500).send({
      error: env.NODE_ENV === 'production' ? 'Internal server error' : errorMessage,
    })
  })

  await fastify.register(healthRoutes)
  await fastify.register(webhookRoutes)
  await fastify.register(adminRoutes)

  return fastify
}
