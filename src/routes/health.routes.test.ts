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
import { prisma } from '../lib/prisma.js'

describe('health routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    const { buildApp } = await import('../app.js')
    app = await buildApp()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /health', () => {
    it('should return healthy when database is connected', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '1': 1 }])

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('healthy')
      expect(body.name).toBe('gs-webhook-2-events')
      expect(body.version).toBe('1.0.0')
      expect(body.timestamp).toBeDefined()
    })

    it('should return unhealthy when database fails', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection failed'))

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(503)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('unhealthy')
      expect(body.error).toBe('Database connection failed')
    })
  })

  describe('GET /ready', () => {
    it('should return ready', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('ready')
    })
  })
})
