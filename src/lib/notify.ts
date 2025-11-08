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

/**
 * Создает уведомление с проверкой настроек пользователя
 * Возвращает null, если уведомление отключено в настройках
 */
export async function createNotificationWithSettings({
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
  // Получаем настройки пользователя
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      notifyOnMessages: true,
      notifyOnTasks: true,
      notifyOnReviews: true,
      notifyOnWarnings: true,
    },
  })

  // Если настройки не найдены, создаем уведомление (по умолчанию все включено)
  if (!settings) {
    return createNotification({ userId, message, link, type })
  }

  // Проверяем настройки в зависимости от типа уведомления
  let shouldNotify = true

  switch (type) {
    case 'message':
      shouldNotify = settings.notifyOnMessages ?? true
      break
    case 'review':
      shouldNotify = settings.notifyOnReviews ?? true
      break
    case 'task':
    case 'assignment':
    case 'response':
      shouldNotify = settings.notifyOnTasks ?? true
      break
    case 'warning':
      shouldNotify = settings.notifyOnWarnings ?? true
      break
    // Для других типов (info, login и т.д.) создаем всегда
    default:
      shouldNotify = true
  }

  // Если уведомление отключено, возвращаем null
  if (!shouldNotify) {
    console.log(`🔕 Уведомление типа "${type}" отключено для пользователя ${userId}`)
    return null
  }

  // Создаем уведомление
  return createNotification({ userId, message, link, type })
}