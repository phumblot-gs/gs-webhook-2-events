import { randomBytes } from 'crypto'

export function generateSecretKey(length = 32): string {
  return randomBytes(length).toString('hex')
}
