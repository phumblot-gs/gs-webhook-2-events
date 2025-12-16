import { z } from 'zod'

export const webhookPayloadSchema = z.object({
  account_id: z.number(),
  topic: z.string(),
  type: z.enum(['picture', 'reference']),
  ids: z.array(z.union([z.number(), z.string()])),
  data: z.record(z.string(), z.unknown()).optional(),
  picture_id: z.array(z.number()).optional(),
})

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>

export const webhookQuerySchema = z.object({
  key: z.string().min(1),
})

export const webhookParamsSchema = z.object({
  accountId: z.coerce.number().int().positive(),
})
