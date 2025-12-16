import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { APP_NAME, APP_VERSION } from '../config/constants.js'

export function healthRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              name: { type: 'string' },
              version: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        await prisma.$queryRaw`SELECT 1`

        return await reply.send({
          status: 'healthy',
          name: APP_NAME,
          version: APP_VERSION,
          timestamp: new Date().toISOString(),
        })
      } catch {
        return await reply.status(503).send({
          status: 'unhealthy',
          error: 'Database connection failed',
        })
      }
    }
  )

  fastify.get(
    '/ready',
    {
      schema: {
        description: 'Readiness check endpoint',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: 'ready' })
    }
  )
}
