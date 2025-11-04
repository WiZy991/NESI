import prisma from '@/lib/prisma'
import { getLevelFromXP } from '@/lib/level/calculate'

/**
 * Пересчитывает уровень пользователя на основе его XP
 * Использует XP как основной критерий для определения уровня
 */
export async function recalculateUserLevel(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      xp: true,
      levelId: true
    }
  })

  if (!user) {
    console.warn(`[Level] Пользователь ${userId} не найден для пересчета уровня`)
    return
  }

  const xp = user.xp || 0

  // Получаем уровень на основе XP
  const levelInfo = await getLevelFromXP(xp)

  // Получаем уровень из БД по slug или minScore
  let newLevelId: string | null = null

  // Пытаемся найти уровень в БД
  const dbLevel = await prisma.userLevel.findFirst({
    where: {
      OR: [
        { slug: levelInfo.slug },
        { minScore: { lte: xp } }
      ]
    },
    orderBy: { minScore: 'desc' } // Берем максимальный подходящий уровень
  })

  if (dbLevel) {
    newLevelId = dbLevel.id
  }

  // Если уровень изменился, обновляем
  if (newLevelId !== user.levelId) {
    await prisma.user.update({
      where: { id: userId },
      data: { levelId: newLevelId }
    })

    console.log(
      `[Level] Уровень пользователя ${userId} обновлен: ${user.levelId || 'null'} → ${newLevelId || 'null'} (XP: ${xp})`
    )
  }
}
