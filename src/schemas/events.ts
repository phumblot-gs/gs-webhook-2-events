import { z } from 'zod'

export const streamEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  timestamp: z.string().datetime(),
  source: z.object({
    application: z.string(),
    version: z.string(),
    environment: z.string(),
  }),
  actor: z.object({
    userId: z.string(),
    accountId: z.string(),
    role: z.string().nullable(),
  }),
  scope: z.object({
    accountId: z.string(),
    resourceType: z.string(),
    resourceId: z.string(),
  }),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})

export type StreamEvent = z.infer<typeof streamEventSchema>

export interface StreamEventInput {
  accountId: number
  eventType: string
  resourceType: string
  resourceId: string
  payload: Record<string, unknown>
}
