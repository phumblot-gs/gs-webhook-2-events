import { describe, it, expect } from 'vitest'
import {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
  webhookConfigSchema,
  updateWebhookConfigsSchema,
  paginationSchema,
  failedEventsQuerySchema,
  replayFailedEventsSchema,
} from './admin.js'

describe('admin schemas', () => {
  describe('createClientSchema', () => {
    it('should validate a valid client creation', () => {
      const input = {
        accountId: 12345,
        accountName: 'Test Client',
        enabled: true,
      }

      const result = createClientSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should use default enabled value', () => {
      const input = {
        accountId: 12345,
        accountName: 'Test Client',
      }

      const result = createClientSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.enabled).toBe(true)
      }
    })

    it('should reject negative account ID', () => {
      const input = {
        accountId: -1,
        accountName: 'Test Client',
      }

      const result = createClientSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject empty account name', () => {
      const input = {
        accountId: 12345,
        accountName: '',
      }

      const result = createClientSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('updateClientSchema', () => {
    it('should validate partial updates', () => {
      const input = { accountName: 'Updated Name' }
      const result = updateClientSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should allow empty object', () => {
      const input = {}
      const result = updateClientSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('clientIdParamSchema', () => {
    it('should validate a valid UUID', () => {
      const params = { id: '550e8400-e29b-41d4-a716-446655440000' }
      const result = clientIdParamSchema.safeParse(params)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const params = { id: 'not-a-uuid' }
      const result = clientIdParamSchema.safeParse(params)
      expect(result.success).toBe(false)
    })
  })

  describe('webhookConfigSchema', () => {
    it('should validate a valid config', () => {
      const config = {
        eventType: 'pictures/create',
        enabled: true,
      }

      const result = webhookConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should reject invalid event type', () => {
      const config = {
        eventType: 'invalid/event',
        enabled: true,
      }

      const result = webhookConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('updateWebhookConfigsSchema', () => {
    it('should validate multiple configs', () => {
      const input = {
        configs: [
          { eventType: 'pictures/create', enabled: true },
          { eventType: 'pictures/delete', enabled: false },
        ],
      }

      const result = updateWebhookConfigsSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('paginationSchema', () => {
    it('should use default values', () => {
      const query = {}
      const result = paginationSchema.safeParse(query)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should coerce string values', () => {
      const query = { page: '2', limit: '50' }
      const result = paginationSchema.safeParse(query)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should reject limit over 100', () => {
      const query = { limit: 150 }
      const result = paginationSchema.safeParse(query)
      expect(result.success).toBe(false)
    })
  })

  describe('failedEventsQuerySchema', () => {
    it('should validate with optional filters', () => {
      const query = {
        page: 1,
        limit: 10,
        accountId: 12345,
        eventType: 'pictures/create',
      }

      const result = failedEventsQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
    })
  })

  describe('replayFailedEventsSchema', () => {
    it('should validate with ids', () => {
      const input = {
        ids: ['550e8400-e29b-41d4-a716-446655440000'],
      }

      const result = replayFailedEventsSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should validate with all flag', () => {
      const input = { all: true }
      const result = replayFailedEventsSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })
})
