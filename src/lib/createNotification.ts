import prisma from '@/lib/prisma'

export async function createNotification(
  userId: string,
  message: string,
  link: string,
  type: string = 'info'
) {
  return prisma.notification.create({
    data: {
      userId,
      message,
      link,
      type,
    },
  })
}
