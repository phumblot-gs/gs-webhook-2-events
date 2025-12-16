import { describe, it, expect } from 'vitest'
import { EVENT_TYPES, EVENT_TYPE_TO_NATS, GS_TOPIC_TO_EVENT_TYPE } from './constants.js'

describe('constants', () => {
  describe('EVENT_TYPES', () => {
    it('should have all 6 event types', () => {
      expect(EVENT_TYPES).toHaveLength(6)
      expect(EVENT_TYPES).toContain('pictures/create')
      expect(EVENT_TYPES).toContain('pictures/update')
      expect(EVENT_TYPES).toContain('pictures/delete')
      expect(EVENT_TYPES).toContain('references/create')
      expect(EVENT_TYPES).toContain('references/update')
      expect(EVENT_TYPES).toContain('references/delete')
    })
  })

  describe('EVENT_TYPE_TO_NATS', () => {
    it('should map all event types to NATS event types', () => {
      expect(EVENT_TYPE_TO_NATS['pictures/create']).toBe('picture.create')
      expect(EVENT_TYPE_TO_NATS['pictures/update']).toBe('picture.update')
      expect(EVENT_TYPE_TO_NATS['pictures/delete']).toBe('picture.delete')
      expect(EVENT_TYPE_TO_NATS['references/create']).toBe('reference.create')
      expect(EVENT_TYPE_TO_NATS['references/update']).toBe('reference.update')
      expect(EVENT_TYPE_TO_NATS['references/delete']).toBe('reference.delete')
    })
  })

  describe('GS_TOPIC_TO_EVENT_TYPE', () => {
    it('should map all GS topics to event types', () => {
      expect(GS_TOPIC_TO_EVENT_TYPE['pictures/create']).toBe('pictures/create')
      expect(GS_TOPIC_TO_EVENT_TYPE['pictures/update']).toBe('pictures/update')
      expect(GS_TOPIC_TO_EVENT_TYPE['references/delete']).toBe('references/delete')
    })
  })
})
