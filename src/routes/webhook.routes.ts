import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { logger } from '../lib/logger.js'
import { webhookService } from '../services/webhook.service.js'
import { clientService } from '../services/client.service.js'
import { webhookPayloadSchema, webhookQuerySchema, webhookParamsSchema } from '../schemas/webhook.js'

export function webhookRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Params: { accountId: string }
    Querystring: { key: string }
  }>(
    '/webhook/:accountId',
    {
      schema: {
        description: 'Receive webhook events from Grand Shooting',
        tags: ['Webhook'],
        params: {
          type: 'object',
          properties: {
            accountId: { type: 'string', pattern: '^[0-9]+$', description: 'Grand Shooting account ID' },
          },
          required: ['accountId'],
        },
        querystring: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Secret key for authentication' },
          },
          required: ['key'],
        },
        body: {
          type: 'object',
          properties: {
            account_id: { type: 'number' },
            topic: { type: 'string' },
            type: { type: 'string', enum: ['picture', 'reference'] },
            ids: { type: 'array' },
            data: { type: 'object', additionalProperties: true },
            picture_id: { type: 'array' },
          },
          required: ['account_id', 'topic', 'type', 'ids'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              processed: { type: 'integer' },
              failed: { type: 'integer' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { accountId: string }; Querystring: { key: string } }>, reply: FastifyReply) => {
      const queryResult = webhookQuerySchema.safeParse(request.query)
      if (!queryResult.success) {
        return reply.status(400).send({ error: 'Missing or invalid key parameter' })
      }

      const paramsResult = webhookParamsSchema.safeParse(request.params)
      if (!paramsResult.success) {
        return reply.status(400).send({ error: 'Invalid account ID' })
      }

      const { accountId } = paramsResult.data

      const isValidKey = await clientService.validateWebhookKey(accountId, queryResult.data.key)
      if (!isValidKey) {
        logger.warn({ accountId }, 'Invalid webhook secret key or client not found/disabled')
        return reply.status(401).send({ error: 'Invalid secret key or client not found' })
      }

      const payloadResult = webhookPayloadSchema.safeParse(request.body)
      if (!payloadResult.success) {
        logger.warn({ errors: payloadResult.error.format() }, 'Invalid webhook payload')
        return reply.status(400).send({ error: 'Invalid payload' })
      }

      const payload = payloadResult.data

      if (payload.account_id !== accountId) {
        logger.warn(
          { urlAccountId: accountId, payloadAccountId: payload.account_id },
          'Account ID mismatch between URL and payload'
        )
      }

      const result = await webhookService.processWebhook(accountId, payload)

      return reply.status(200).send({
        success: result.success,
        processed: result.processed,
        failed: result.failed,
      })
    }
  )
}
