// lib/notify.ts
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendNewMessageEmail, sendTaskCompletedEmail, sendNewReviewEmail, sendNewResponseEmail, sendTaskAssignedEmail } from '@/lib/mail'

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
 * Также отправляет email-уведомление, если включено в настройках
 */
export async function createNotificationWithSettings({
  userId,
  message,
  link,
  type = 'info',
  emailData,
}: {
  userId: string
  message: string
  link?: string
  type?: string
  emailData?: {
    fromName?: string
    taskTitle?: string
    taskId?: string
    preview?: string
    amount?: number
    rating?: number
    comment?: string
    executorName?: string
    customerName?: string
  }
}) {
  // Получаем настройки и email пользователя
  const [settings, user] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId },
      select: {
        emailNotifications: true,
        notifyOnMessages: true,
        notifyOnTasks: true,
        notifyOnReviews: true,
        notifyOnWarnings: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    }),
  ])

  // Если настройки не найдены, создаем уведомление (по умолчанию все включено)
  if (!settings) {
    const notification = await createNotification({ userId, message, link, type })
    // Отправляем email, если включено по умолчанию
    if (user?.email && emailData) {
      sendEmailNotification(user.email, type, message, link, emailData).catch(err => {
        logger.error('Ошибка отправки email-уведомления', err, { userId, type })
      })
    }
    return notification
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
    logger.debug(`Уведомление типа "${type}" отключено для пользователя`, { userId, type })
    return null
  }

  // Создаем уведомление
  const notification = await createNotification({ userId, message, link, type })

  // Отправляем email-уведомление, если включено в настройках
  if (settings.emailNotifications && user?.email && emailData) {
    sendEmailNotification(user.email, type, message, link, emailData).catch(err => {
      logger.error('Ошибка отправки email-уведомления', err, { userId, type })
    })
  }

  return notification
}

/**
 * Отправляет email-уведомление в зависимости от типа
 */
async function sendEmailNotification(
  email: string,
  type: string,
  message: string,
  link?: string,
  emailData?: {
    fromName?: string
    taskTitle?: string
    taskId?: string
    preview?: string
    amount?: number
    rating?: number
    comment?: string
    executorName?: string
    customerName?: string
  }
) {
  try {
    switch (type) {
      case 'message':
        if (emailData?.fromName && emailData?.preview) {
          await sendNewMessageEmail(
            email,
            emailData.fromName,
            emailData.preview,
            emailData.taskTitle
          )
        }
        break

      case 'payment':
        if (emailData?.taskTitle && emailData?.taskId && emailData?.amount !== undefined) {
          await sendTaskCompletedEmail(
            email,
            emailData.taskTitle,
            emailData.taskId,
            emailData.amount
          )
        }
        break

      case 'task':
        // Для других типов задач можно добавить отдельную обработку
        break

      case 'review':
        if (emailData?.rating && emailData?.comment && emailData?.fromName) {
          await sendNewReviewEmail(
            email,
            emailData.rating,
            emailData.comment,
            emailData.fromName
          )
        }
        break

      case 'response':
        if (emailData?.taskTitle && emailData?.taskId && emailData?.executorName) {
          await sendNewResponseEmail(
            email,
            emailData.taskTitle,
            emailData.taskId,
            emailData.executorName
          )
        }
        break

      case 'assignment':
        if (emailData?.taskTitle && emailData?.taskId && emailData?.customerName) {
          await sendTaskAssignedEmail(
            email,
            emailData.taskTitle,
            emailData.taskId,
            emailData.customerName
          )
        }
        break

      default:
        // Для других типов не отправляем email
        break
    }
  } catch (error: any) {
    logger.error('Ошибка отправки email-уведомления', error, { type, email })
  }
}