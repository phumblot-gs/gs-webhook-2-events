/**
 * Bijective conversion between integers and UUID v8 format.
 *
 * UUID v8 is a valid UUID format (RFC 9562) that allows custom data.
 * Format: xxxxxxxx-xxxx-8xxx-8xxx-xxxxxxxxxxxx
 *                       ^    ^
 *                       |    variant (8,9,a,b = binary 10xx)
 *                       version 8
 *
 * We encode the integer in the available bits, supporting up to 2^60.
 */

/**
 * Convert an integer to a valid UUID v8 string.
 * Bijective for integers 0 to 2^60.
 */
export function intToUuidV8(n: number): string {
  if (n < 0) {
    throw new Error('intToUuidV8 only supports non-negative integers')
  }

  // Convert to hex, pad to 15 chars (60 bits)
  const hex = n.toString(16).padStart(15, '0')

  // Build UUID v8 structure:
  // - Positions 0-11: first 12 hex chars of our data (48 bits)
  // - Position 12: version '8'
  // - Positions 13-15: next 3 hex chars of our data (12 bits)
  // - Position 16: variant '8' (binary 1000, we lose these 4 bits)
  // - Positions 17-31: remaining zeros

  const uuid =
    hex.slice(0, 8) +   // 8 chars
    hex.slice(8, 12) +  // 4 chars
    '8' +               // version
    hex.slice(12, 15) + // 3 chars
    '8' +               // variant
    '000000000000000'   // padding (15 chars, total 32)

  // Format with dashes: 8-4-4-4-12
  return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`
}

/**
 * Convert a UUID v8 string back to an integer.
 * Only works with UUIDs created by intToUuidV8.
 */
export function uuidV8ToInt(uuid: string): number {
  const hex = uuid.replace(/-/g, '')

  // Extract the data parts (skip version at position 12 and variant at position 16)
  const dataHex =
    hex.slice(0, 12) +  // first 12 chars
    hex.slice(13, 16)   // 3 chars after version (skip variant and rest)

  return parseInt(dataHex, 16)
}
