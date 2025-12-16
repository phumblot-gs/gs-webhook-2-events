import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../config/env.js'
import { clientService } from '../services/client.service.js'
import { failedEventsService } from '../services/failed-events.service.js'
import {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
  updateWebhookConfigsSchema,
  paginationSchema,
  failedEventsQuerySchema,
  replayFailedEventsSchema,
} from '../schemas/admin.js'

async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key']

  if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
    return reply.status(401).send({ error: 'Invalid or missing API key' })
  }
}

export function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', adminAuth)

  // List clients
  fastify.get(
    '/admin/clients',
    {
      schema: {
        description: 'List all clients with pagination',
        tags: ['Admin - Clients'],
        security: [{ apiKey: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    accountId: { type: 'integer' },
                    accountName: { type: 'string' },
                    webhookSecretKey: { type: 'string' },
                    enabled: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    webhookConfigs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          eventType: { type: 'string' },
                          enabled: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { page?: number; limit?: number } }>, reply: FastifyReply) => {
      const query = paginationSchema.parse(request.query)
      const result = await clientService.findAll(query.page, query.limit)
      return reply.send(result)
    }
  )

  // Get client by ID
  fastify.get(
    '/admin/clients/:id',
    {
      schema: {
        description: 'Get a client by ID',
        tags: ['Admin - Clients'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              accountId: { type: 'integer' },
              accountName: { type: 'string' },
              webhookSecretKey: { type: 'string' },
              enabled: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              webhookConfigs: { type: 'array' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = clientIdParamSchema.parse(request.params)
      const client = await clientService.findById(params.id)

      if (!client) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      return reply.send(client)
    }
  )

  // Create client
  fastify.post(
    '/admin/clients',
    {
      schema: {
        description: 'Create a new client',
        tags: ['Admin - Clients'],
        security: [{ apiKey: [] }],
        body: {
          type: 'object',
          properties: {
            accountId: { type: 'integer', description: 'Grand Shooting account ID' },
            accountName: { type: 'string', description: 'Client name' },
            enabled: { type: 'boolean', default: true },
          },
          required: ['accountId', 'accountName'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              accountId: { type: 'integer' },
              accountName: { type: 'string' },
              webhookSecretKey: { type: 'string' },
              enabled: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              webhookConfigs: { type: 'array' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          409: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = createClientSchema.parse(request.body)

      const existing = await clientService.findByAccountId(input.accountId)
      if (existing) {
        return reply.status(409).send({ error: 'Client with this account ID already exists' })
      }

      const client = await clientService.create(input)
      return reply.status(201).send(client)
    }
  )

  // Update client
  fastify.put(
    '/admin/clients/:id',
    {
      schema: {
        description: 'Update a client',
        tags: ['Admin - Clients'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            accountName: { type: 'string' },
            enabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              accountId: { type: 'integer' },
              accountName: { type: 'string' },
              webhookSecretKey: { type: 'string' },
              enabled: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              webhookConfigs: { type: 'array' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = clientIdParamSchema.parse(request.params)
      const input = updateClientSchema.parse(request.body)

      const existing = await clientService.findById(params.id)
      if (!existing) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      const client = await clientService.update(params.id, input)
      return reply.send(client)
    }
  )

  // Regenerate webhook key
  fastify.post(
    '/admin/clients/:id/regenerate-key',
    {
      schema: {
        description: 'Regenerate the webhook secret key for a client',
        tags: ['Admin - Clients'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              accountId: { type: 'integer' },
              accountName: { type: 'string' },
              webhookSecretKey: { type: 'string' },
              enabled: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              webhookConfigs: { type: 'array' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = clientIdParamSchema.parse(request.params)

      const existing = await clientService.findById(params.id)
      if (!existing) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      const client = await clientService.regenerateWebhookKey(params.id)
      return reply.send(client)
    }
  )

  // Delete client
  fastify.delete(
    '/admin/clients/:id',
    {
      schema: {
        description: 'Delete a client',
        tags: ['Admin - Clients'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          204: {
            type: 'null',
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = clientIdParamSchema.parse(request.params)

      const existing = await clientService.findById(params.id)
      if (!existing) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      await clientService.delete(params.id)
      return reply.status(204).send()
    }
  )

  // Get webhook configs for client
  fastify.get(
    '/admin/clients/:id/webhooks',
    {
      schema: {
        description: 'Get webhook configurations for a client',
        tags: ['Admin - Webhooks'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                eventType: { type: 'string' },
                enabled: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = clientIdParamSchema.parse(request.params)

      const existing = await clientService.findById(params.id)
      if (!existing) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      const configs = await clientService.getWebhookConfigs(params.id)
      return reply.send(configs)
    }
  )

  // Update webhook configs for client
  fastify.put(
    '/admin/clients/:id/webhooks',
    {
      schema: {
        description: 'Update webhook configurations for a client',
        tags: ['Admin - Webhooks'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            configs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  eventType: {
                    type: 'string',
                    enum: ['pictures/create', 'pictures/update', 'pictures/delete', 'references/create', 'references/update', 'references/delete'],
                  },
                  enabled: { type: 'boolean' },
                },
                required: ['eventType', 'enabled'],
              },
            },
          },
          required: ['configs'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                eventType: { type: 'string' },
                enabled: { type: 'boolean' },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = clientIdParamSchema.parse(request.params)
      const input = updateWebhookConfigsSchema.parse(request.body)

      const existing = await clientService.findById(params.id)
      if (!existing) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      const configs = await clientService.updateWebhookConfigs(params.id, input)
      return reply.send(configs)
    }
  )

  // List failed events
  fastify.get(
    '/admin/failed-events',
    {
      schema: {
        description: 'List failed events with pagination and filtering',
        tags: ['Admin - Failed Events'],
        security: [{ apiKey: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
            accountId: { type: 'integer' },
            eventType: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    accountId: { type: 'integer' },
                    eventType: { type: 'string' },
                    payload: { type: 'object' },
                    error: { type: 'string' },
                    retryCount: { type: 'integer' },
                    nextRetry: { type: 'string', nullable: true },
                    createdAt: { type: 'string' },
                    client: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        accountName: { type: 'string' },
                      },
                    },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { page?: number; limit?: number; accountId?: number; eventType?: string } }>, reply: FastifyReply) => {
      const query = failedEventsQuerySchema.parse(request.query)
      const result = await failedEventsService.findAll(query)
      return reply.send(result)
    }
  )

  // Get failed events stats
  fastify.get(
    '/admin/failed-events/stats',
    {
      schema: {
        description: 'Get statistics about failed events',
        tags: ['Admin - Failed Events'],
        security: [{ apiKey: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              pending: { type: 'integer' },
              maxRetries: { type: 'integer' },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await failedEventsService.getStats()
      return reply.send(stats)
    }
  )

  // Replay failed events
  fastify.post(
    '/admin/failed-events/replay',
    {
      schema: {
        description: 'Replay failed events',
        tags: ['Admin - Failed Events'],
        security: [{ apiKey: [] }],
        body: {
          type: 'object',
          properties: {
            ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
            all: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              replayed: { type: 'integer' },
              failed: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = replayFailedEventsSchema.parse(request.body)
      const result = await failedEventsService.replayEvents(input.ids, input.all)
      return reply.send(result)
    }
  )

  // Delete failed event
  fastify.delete(
    '/admin/failed-events/:id',
    {
      schema: {
        description: 'Delete a failed event',
        tags: ['Admin - Failed Events'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params
      await failedEventsService.deleteEvent(id)
      return reply.status(204).send()
    }
  )
}
