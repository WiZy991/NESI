import prisma from '@/lib/prisma'

/**
 * Возвращает true, если у исполнителя есть активная задача.
 * Под "активной" считаем status = 'in_progress'.
 * (Расширишь позже при необходимости.)
 */
export async function hasActiveTask(executorId: string) {
  const count = await prisma.task.count({
    where: {
      executorId,
      status: 'in_progress',
    },
  })
  return count > 0
}
