import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'

describe('env schema validation', () => {
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),
    DATABASE_URL: z.string().url(),
    WEBHOOK_SECRET_KEY: z.string().min(16),
    ADMIN_API_KEY: z.string().min(16),
    GS_STREAM_API_URL: z.string().url(),
    GS_STREAM_API_TOKEN: z.string().min(1),
    RETRY_JOB_INTERVAL_MS: z.coerce.number().default(60000),
    RETRY_JOB_MAX_RETRIES: z.coerce.number().default(10),
  })

  it('should validate valid environment variables', () => {
    const env = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://localhost:5432/test',
      WEBHOOK_SECRET_KEY: 'test-webhook-secret-key',
      ADMIN_API_KEY: 'test-admin-api-key-123',
      GS_STREAM_API_URL: 'https://test.example.com',
      GS_STREAM_API_TOKEN: 'test-token',
    }

    const result = envSchema.safeParse(env)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe('postgresql://localhost:5432/test')
      expect(result.data.WEBHOOK_SECRET_KEY).toBe('test-webhook-secret-key')
      expect(result.data.NODE_ENV).toBe('development')
      expect(result.data.PORT).toBe(3000)
    }
  })

  it('should use default values for optional variables', () => {
    const env = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost:5432/test',
      WEBHOOK_SECRET_KEY: 'test-webhook-secret-key',
      ADMIN_API_KEY: 'test-admin-api-key-123',
      GS_STREAM_API_URL: 'https://test.example.com',
      GS_STREAM_API_TOKEN: 'test-token',
    }

    const result = envSchema.safeParse(env)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(3000)
      expect(result.data.HOST).toBe('0.0.0.0')
      expect(result.data.RETRY_JOB_INTERVAL_MS).toBe(60000)
      expect(result.data.RETRY_JOB_MAX_RETRIES).toBe(10)
    }
  })

  it('should reject invalid DATABASE_URL', () => {
    const env = {
      DATABASE_URL: 'not-a-url',
      WEBHOOK_SECRET_KEY: 'test-webhook-secret-key',
      ADMIN_API_KEY: 'test-admin-api-key-123',
      GS_STREAM_API_URL: 'https://test.example.com',
      GS_STREAM_API_TOKEN: 'test-token',
    }

    const result = envSchema.safeParse(env)
    expect(result.success).toBe(false)
  })

  it('should reject short WEBHOOK_SECRET_KEY', () => {
    const env = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      WEBHOOK_SECRET_KEY: 'short',
      ADMIN_API_KEY: 'test-admin-api-key-123',
      GS_STREAM_API_URL: 'https://test.example.com',
      GS_STREAM_API_TOKEN: 'test-token',
    }

    const result = envSchema.safeParse(env)
    expect(result.success).toBe(false)
  })
})
