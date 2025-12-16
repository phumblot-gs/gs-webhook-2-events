import { z } from 'zod'
import { EVENT_TYPES } from '../config/constants.js'

export const createClientSchema = z.object({
  accountId: z.number().int().positive(),
  accountName: z.string().min(1).max(255),
  enabled: z.boolean().default(true),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientSchema = z.object({
  accountName: z.string().min(1).max(255).optional(),
  enabled: z.boolean().optional(),
})

export type UpdateClientInput = z.infer<typeof updateClientSchema>

export const clientIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const webhookConfigSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  enabled: z.boolean(),
})

export const updateWebhookConfigsSchema = z.object({
  configs: z.array(webhookConfigSchema),
})

export type UpdateWebhookConfigsInput = z.infer<typeof updateWebhookConfigsSchema>

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const failedEventsQuerySchema = paginationSchema.extend({
  accountId: z.coerce.number().int().positive().optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
})

export const replayFailedEventsSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
})
