import pino from 'pino'
import { env } from '../config/env.js'

const devTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
}

export const logger =
  env.NODE_ENV === 'development'
    ? pino({
        level: 'debug',
        transport: devTransport,
      })
    : pino({
        level: 'info',
      })
