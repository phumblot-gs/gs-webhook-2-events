export const EVENT_TYPES = [
  'pictures/create',
  'pictures/update',
  'pictures/delete',
  'references/create',
  'references/update',
  'references/delete',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export const EVENT_TYPE_TO_NATS = {
  'pictures/create': 'picture.create',
  'pictures/update': 'picture.update',
  'pictures/delete': 'picture.delete',
  'references/create': 'reference.create',
  'references/update': 'reference.update',
  'references/delete': 'reference.delete',
} as const satisfies Record<EventType, string>

export const GS_TOPIC_TO_EVENT_TYPE: Record<string, EventType> = {
  'pictures/create': 'pictures/create',
  'pictures/update': 'pictures/update',
  'pictures/delete': 'pictures/delete',
  'references/create': 'references/create',
  'references/update': 'references/update',
  'references/delete': 'references/delete',
}

export const APP_NAME = 'gs-webhook-2-events'
export const APP_VERSION = '1.0.0'
