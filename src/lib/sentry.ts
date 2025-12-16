import * as Sentry from '@sentry/node'
import { env } from '../config/env.js'
import { APP_NAME, APP_VERSION } from '../config/constants.js'

export function initSentry() {
  if (!env.SENTRY_DSN) {
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: `${APP_NAME}@${APP_VERSION}`,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.prismaIntegration(),
    ],
  })
}

export { Sentry }
