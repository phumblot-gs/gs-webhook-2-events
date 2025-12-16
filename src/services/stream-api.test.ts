import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    GS_STREAM_API_URL: 'https://test-stream-api.example.com',
    GS_STREAM_API_TOKEN: 'test-token',
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

describe('StreamApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should publish an event successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    const { StreamApiClient } = await import('./stream-api.js')
    const client = new StreamApiClient()

    const result = await client.publishEvent({
      accountId: 12345,
      eventType: 'picture.create',
      resourceType: 'picture',
      resourceId: '1',
      payload: { name: 'test' },
    })

    expect(result.success).toBe(true)
    expect(result.eventId).toBeDefined()
    expect(fetch).toHaveBeenCalledWith(
      'https://test-stream-api.example.com/api/events',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      })
    )
  })

  it('should handle API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    const { StreamApiClient } = await import('./stream-api.js')
    const client = new StreamApiClient()

    const result = await client.publishEvent({
      accountId: 12345,
      eventType: 'picture.create',
      resourceType: 'picture',
      resourceId: '1',
      payload: {},
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('HTTP 500')
  })

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { StreamApiClient } = await import('./stream-api.js')
    const client = new StreamApiClient()

    const result = await client.publishEvent({
      accountId: 12345,
      eventType: 'picture.create',
      resourceType: 'picture',
      resourceId: '1',
      payload: {},
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })

  it('should format event correctly', async () => {
    let capturedBody: string | undefined

    global.fetch = vi.fn().mockImplementation((_url, options: { body?: string }) => {
      capturedBody = options.body
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    })

    const { StreamApiClient } = await import('./stream-api.js')
    const client = new StreamApiClient()

    await client.publishEvent({
      accountId: 12345,
      eventType: 'picture.create',
      resourceType: 'picture',
      resourceId: '999',
      payload: { name: 'test-picture' },
    })

    expect(capturedBody).toBeDefined()
    const event = JSON.parse(capturedBody!)

    expect(event.eventType).toBe('picture.create')
    expect(event.source.application).toBe('gs-webhook-2-events')
    expect(event.actor.userId).toBe('00000000-0000-0000-0000-000000000000')
    expect(event.actor.accountId).toBe('00000000-0003-8039-8000-000000000000')
    expect(event.actor.role).toBe('system')
    expect(event.scope.accountId).toBe('00000000-0003-8039-8000-000000000000')
    expect(event.metadata).toEqual({})
    expect(event.scope.resourceType).toBe('picture')
    expect(event.scope.resourceId).toBe('999')
    expect(event.payload.name).toBe('test-picture')
  })
})
