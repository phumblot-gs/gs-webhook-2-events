import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),

  ADMIN_API_KEY: z.string().min(16),

  GS_STREAM_API_URL: z.string().url(),
  GS_STREAM_API_TOKEN: z.string().min(1),

  RETRY_JOB_INTERVAL_MS: z.coerce.number().default(60000),
  RETRY_JOB_MAX_RETRIES: z.coerce.number().default(10),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Invalid environment variables:')
    console.error(result.error.format())
    process.exit(1)
  }

  return result.data
}

export const env = loadEnv()
