import pino from 'pino'
import { env } from '../config/env.js'

function createLogger() {
  const devTransport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  }

  // Development: pretty print
  if (env.NODE_ENV === 'development') {
    return pino({
      level: 'debug',
      transport: devTransport,
    })
  }

  // Production/Staging with Axiom
  if (env.AXIOM_TOKEN) {
    return pino({
      level: 'info',
      transport: {
        target: '@axiomhq/pino',
        options: {
          dataset: env.AXIOM_DATASET,
          token: env.AXIOM_TOKEN,
        },
      },
    })
  }

  // Production/Staging without Axiom
  return pino({
    level: 'info',
  })
}

export const logger = createLogger()
