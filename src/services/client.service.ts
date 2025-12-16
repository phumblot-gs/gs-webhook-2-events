import { prisma } from '../lib/prisma.js'
import { generateSecretKey } from '../lib/crypto.js'
import { EVENT_TYPES } from '../config/constants.js'
import type { CreateClientInput, UpdateClientInput, UpdateWebhookConfigsInput } from '../schemas/admin.js'

export class ClientService {
  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          webhookConfigs: true,
        },
      }),
      prisma.client.count(),
    ])

    return {
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findById(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        webhookConfigs: true,
      },
    })
  }

  async findByAccountId(accountId: number) {
    return prisma.client.findUnique({
      where: { accountId },
      include: {
        webhookConfigs: true,
      },
    })
  }

  async create(input: CreateClientInput) {
    const webhookSecretKey = generateSecretKey()

    return prisma.client.create({
      data: {
        accountId: input.accountId,
        accountName: input.accountName,
        webhookSecretKey,
        enabled: input.enabled,
        webhookConfigs: {
          create: EVENT_TYPES.map((eventType) => ({
            eventType,
            enabled: true,
          })),
        },
      },
      include: {
        webhookConfigs: true,
      },
    })
  }

  async regenerateWebhookKey(id: string) {
    const webhookSecretKey = generateSecretKey()

    return prisma.client.update({
      where: { id },
      data: { webhookSecretKey },
      include: {
        webhookConfigs: true,
      },
    })
  }

  async update(id: string, input: UpdateClientInput) {
    return prisma.client.update({
      where: { id },
      data: {
        ...(input.accountName !== undefined && { accountName: input.accountName }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
      },
      include: {
        webhookConfigs: true,
      },
    })
  }

  async delete(id: string) {
    return prisma.client.delete({
      where: { id },
    })
  }

  async updateWebhookConfigs(clientId: string, input: UpdateWebhookConfigsInput) {
    const operations = input.configs.map((config) =>
      prisma.webhookConfig.upsert({
        where: {
          clientId_eventType: {
            clientId,
            eventType: config.eventType,
          },
        },
        update: {
          enabled: config.enabled,
        },
        create: {
          clientId,
          eventType: config.eventType,
          enabled: config.enabled,
        },
      })
    )

    await prisma.$transaction(operations)

    return prisma.webhookConfig.findMany({
      where: { clientId },
    })
  }

  async getWebhookConfigs(clientId: string) {
    return prisma.webhookConfig.findMany({
      where: { clientId },
    })
  }

  async isEventEnabled(accountId: number, eventType: string): Promise<boolean> {
    const client = await prisma.client.findUnique({
      where: { accountId },
      include: {
        webhookConfigs: {
          where: { eventType },
        },
      },
    })

    if (!client || !client.enabled) {
      return false
    }

    const config = client.webhookConfigs[0]
    return config?.enabled ?? false
  }

  async validateWebhookKey(accountId: number, key: string): Promise<boolean> {
    const client = await prisma.client.findUnique({
      where: { accountId },
      select: { webhookSecretKey: true, enabled: true },
    })

    if (!client?.enabled) {
      return false
    }

    return client.webhookSecretKey === key
  }
}

export const clientService = new ClientService()
