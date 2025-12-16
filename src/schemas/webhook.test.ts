import { describe, it, expect } from 'vitest'
import { webhookPayloadSchema, webhookQuerySchema, webhookParamsSchema } from './webhook.js'

describe('webhook schemas', () => {
  describe('webhookPayloadSchema', () => {
    it('should validate a valid webhook payload', () => {
      const payload = {
        account_id: 12345,
        topic: 'pictures/create',
        type: 'picture',
        ids: [1, 2, 3],
        data: {
          '1': { name: 'test1' },
          '2': { name: 'test2' },
        },
      }

      const result = webhookPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('should accept string ids', () => {
      const payload = {
        account_id: 12345,
        topic: 'references/update',
        type: 'reference',
        ids: ['ref-1', 'ref-2'],
      }

      const result = webhookPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('should reject invalid type', () => {
      const payload = {
        account_id: 12345,
        topic: 'pictures/create',
        type: 'invalid',
        ids: [1],
      }

      const result = webhookPayloadSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('should reject missing required fields', () => {
      const payload = {
        account_id: 12345,
        topic: 'pictures/create',
      }

      const result = webhookPayloadSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('should accept deprecated picture_id field', () => {
      const payload = {
        account_id: 12345,
        topic: 'pictures/create',
        type: 'picture',
        ids: [1, 2],
        picture_id: [1, 2],
      }

      const result = webhookPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })
  })

  describe('webhookQuerySchema', () => {
    it('should validate a valid query', () => {
      const query = { key: 'secret-key' }
      const result = webhookQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
    })

    it('should reject empty key', () => {
      const query = { key: '' }
      const result = webhookQuerySchema.safeParse(query)
      expect(result.success).toBe(false)
    })

    it('should reject missing key', () => {
      const query = {}
      const result = webhookQuerySchema.safeParse(query)
      expect(result.success).toBe(false)
    })
  })

  describe('webhookParamsSchema', () => {
    it('should validate a valid account ID', () => {
      const params = { accountId: '12345' }
      const result = webhookParamsSchema.safeParse(params)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.accountId).toBe(12345)
      }
    })

    it('should reject negative account ID', () => {
      const params = { accountId: '-1' }
      const result = webhookParamsSchema.safeParse(params)
      expect(result.success).toBe(false)
    })

    it('should reject non-integer account ID', () => {
      const params = { accountId: '12.5' }
      const result = webhookParamsSchema.safeParse(params)
      expect(result.success).toBe(false)
    })
  })
})
