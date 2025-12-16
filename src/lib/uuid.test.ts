import { describe, it, expect } from 'vitest'
import { intToUuidV8, uuidV8ToInt } from './uuid.js'

describe('UUID v8 conversion', () => {
  it('should convert small integers to valid UUID v8', () => {
    const uuid = intToUuidV8(16)
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('should convert large integers to valid UUID v8', () => {
    const uuid = intToUuidV8(123456789012345)
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('should be bijective - roundtrip small integer', () => {
    const original = 16
    const uuid = intToUuidV8(original)
    const result = uuidV8ToInt(uuid)
    expect(result).toBe(original)
  })

  it('should be bijective - roundtrip medium integer', () => {
    const original = 12345
    const uuid = intToUuidV8(original)
    const result = uuidV8ToInt(uuid)
    expect(result).toBe(original)
  })

  it('should be bijective - roundtrip large integer', () => {
    const original = 999999999999
    const uuid = intToUuidV8(original)
    const result = uuidV8ToInt(uuid)
    expect(result).toBe(original)
  })

  it('should handle zero', () => {
    const uuid = intToUuidV8(0)
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(uuidV8ToInt(uuid)).toBe(0)
  })

  it('should throw for negative integers', () => {
    expect(() => intToUuidV8(-1)).toThrow('intToUuidV8 only supports non-negative integers')
  })

  it('should produce different UUIDs for different integers', () => {
    const uuid1 = intToUuidV8(1)
    const uuid2 = intToUuidV8(2)
    expect(uuid1).not.toBe(uuid2)
  })

  it('should have version 8 at correct position', () => {
    const uuid = intToUuidV8(12345)
    const parts = uuid.split('-')
    expect(parts[2][0]).toBe('8') // version nibble
  })

  it('should have variant 8 at correct position', () => {
    const uuid = intToUuidV8(12345)
    const parts = uuid.split('-')
    expect(parts[3][0]).toBe('8') // variant nibble
  })
})
