import prisma from '@/lib/prisma'
import { recalculateUserLevel } from '@/lib/user/recalculateLevel'
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'

export interface XPResult {
  oldXP: number
  newXP: number
  levelChanged: boolean
  oldLevelId?: string | null
  newLevelId?: string | null
  newLevelName?: string
}

/**
 * Начисляет XP пользователю и автоматически пересчитывает уровень
 * @param userId ID пользователя
 * @param amount Количество XP для начисления
 * @param reason Причина начисления (для логирования)
 * @returns Результат начисления XP
 */
export async function awardXP(
  userId: string,
  amount: number,
  reason: string
): Promise<XPResult> {
  if (amount <= 0) {
    throw new Error('Количество XP должно быть больше 0')
  }

  // Получаем текущего пользователя
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xp: true,
      levelId: true,
      level: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  if (!user) {
    throw new Error(`Пользователь с ID ${userId} не найден`)
  }

  const oldXP = user.xp || 0
  const newXP = oldXP + amount
  const oldLevelId = user.levelId
  const oldLevelName = user.level?.name

  // Обновляем XP в БД
  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXP }
  })

  // Пересчитываем уровень
  await recalculateUserLevel(userId)

  // Проверяем, повысился ли уровень
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      level: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  })

  const newLevelId = updatedUser?.levelId
  const newLevelName = updatedUser?.level?.name
  const levelChanged = newLevelId !== oldLevelId && newLevelId !== null

  // Логируем начисление XP
  console.log(`[XP] Пользователь ${userId}: +${amount} XP (${oldXP} → ${newXP}) | Причина: ${reason}`)

  // Если уровень повысился, отправляем уведомление
  if (levelChanged && newLevelName) {
    try {
      // Создаем уведомление в БД
      await prisma.notification.create({
        data: {
          userId,
          type: 'level_up',
          title: '🎉 Поздравляем!',
          message: `Вы повысили уровень до "${newLevelName}"!`,
          link: '/level'
        }
      })

      // Отправляем уведомление в реальном времени
      sendNotificationToUser(userId, {
        id: `level-up-${Date.now()}`,
        userId,
        type: 'level_up',
        title: '🎉 Поздравляем!',
        message: `Вы повысили уровень до "${newLevelName}"!`,
        link: '/level',
        isRead: false,
        createdAt: new Date()
      })

      console.log(`[XP] Уровень повышен: ${oldLevelName || 'Без уровня'} → ${newLevelName}`)
    } catch (error) {
      console.error('[XP] Ошибка отправки уведомления о повышении уровня:', error)
    }
  }

  return {
    oldXP,
    newXP,
    levelChanged,
    oldLevelId,
    newLevelId: newLevelId || null,
    newLevelName: newLevelName || undefined
  }
}

/**
 * Начисляет XP нескольким пользователям (для массовых операций)
 */
export async function awardXPToMultiple(
  awards: Array<{ userId: string; amount: number; reason: string }>
): Promise<XPResult[]> {
  const results: XPResult[] = []

  for (const award of awards) {
    try {
      const result = await awardXP(award.userId, award.amount, award.reason)
      results.push(result)
    } catch (error) {
      console.error(`[XP] Ошибка начисления XP пользователю ${award.userId}:`, error)
      // Продолжаем обработку остальных
    }
  }

  return results
}

