// lib/notify.ts
import prisma from '@/lib/prisma'

export async function createNotification({
  userId,
  message,
  link,
  type = 'info',
}: {
  userId: string
  message: string
  link?: string
  type?: string
}) {
  return prisma.notification.create({
    data: {
      userId,
      message,
      link,
      type,
    },
  })
}
