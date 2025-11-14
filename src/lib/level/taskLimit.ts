import prisma from '@/lib/prisma'
import { getLevelFromXP } from './calculate'
import { getMaxTasksForLevel } from './rewards'

/**
 * Получает количество активных задач исполнителя
 */
export async function getActiveTasksCount(executorId: string): Promise<number> {
  return await prisma.task.count({
    where: {
      executorId,
      status: 'in_progress',
    },
  })
}

/**
 * Проверяет, может ли исполнитель взять еще задачи
 * @param executorId - ID исполнителя
 * @returns Объект с информацией о возможности взять задачу
 */
export async function canTakeMoreTasks(executorId: string): Promise<{
  canTake: boolean
  activeCount: number
  maxCount: number
  remaining: number
}> {
  const user = await prisma.user.findUnique({
    where: { id: executorId },
    select: { xp: true },
  })

  if (!user) {
    return { canTake: false, activeCount: 0, maxCount: 0, remaining: 0 }
  }

  const baseXp = user.xp || 0
  const passedTests = await prisma.certificationAttempt.count({
    where: { userId: executorId, passed: true },
  })
  const xpComputed = baseXp + passedTests * 10

  const levelInfo = await getLevelFromXP(xpComputed)
  const maxCount = getMaxTasksForLevel(levelInfo.level)
  const activeCount = await getActiveTasksCount(executorId)

  return {
    canTake: activeCount < maxCount,
    activeCount,
    maxCount,
    remaining: Math.max(0, maxCount - activeCount),
  }
}

