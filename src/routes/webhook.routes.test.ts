import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: '0.0.0.0',
    DATABASE_URL: 'postgresql://localhost:5432/test',
    WEBHOOK_SECRET_KEY: 'test-secret-key-12345',
    ADMIN_API_KEY: 'test-admin-key-12345',
    GS_STREAM_API_URL: 'https://test.example.com',
    GS_STREAM_API_TOKEN: 'test-token',
    RETRY_JOB_INTERVAL_MS: 60000,
    RETRY_JOB_MAX_RETRIES: 10,
  },
}))

vi.mock('../lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
    client: { findUnique: vi.fn() },
    failedEvent: { create: vi.fn() },
  },
}))

vi.mock('../services/webhook.service.js', () => ({
  webhookService: {
    processWebhook: vi.fn().mockResolvedValue({
      success: true,
      processed: 2,
      failed: 0,
      errors: [],
    }),
  },
}))

import type { FastifyInstance } from 'fastify'

describe('webhook routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    const { buildApp } = await import('../app.js')
    app = await buildApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('should accept valid webhook request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/12345?key=test-secret-key-12345',
      payload: {
        account_id: 12345,
        topic: 'pictures/create',
        type: 'picture',
        ids: [1, 2],
        data: {},
      },
    })

    if (response.statusCode !== 200) {
      console.log('Response body:', response.body)
    }
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.processed).toBe(2)
  })

  it('should reject request without key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/12345',
      payload: {
        account_id: 12345,
        topic: 'pictures/create',
        type: 'picture',
        ids: [1],
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('should reject request with invalid key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/12345?key=wrong-key',
      payload: {
        account_id: 12345,
        topic: 'pictures/create',
        type: 'picture',
        ids: [1],
      },
    })

    expect(response.statusCode).toBe(401)
  })

  it('should reject invalid payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/12345?key=test-secret-key-12345',
      payload: {
        account_id: 12345,
        topic: 'pictures/create',
        // missing type and ids
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('should reject invalid account ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/invalid?key=test-secret-key-12345',
      payload: {
        account_id: 12345,
        topic: 'pictures/create',
        type: 'picture',
        ids: [1],
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
